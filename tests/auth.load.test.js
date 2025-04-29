const axios = require('axios');
const User = require('../models/user');
const mongoose = require('mongoose');

// Test configuration
const NUM_USERS = 50;
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL_PREFIX = 'loadtestuser';
const TEST_PASSWORD = 'testpassword123';
const TEST_TIMEOUT = 300000; // 30 seconds timeout

describe('Load Testing User register', () => {
    let testUsers = [];

    beforeAll(async () => {
        try {
            console.log('Connecting to test database...');
            await mongoose.connect("mongodb+srv://kartikkanteti:nBhzJGszf4fl1zkh@cluster0.mdo97op.mongodb.net", {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });

            // Clean up any existing test users before starting
            await User.deleteMany({
                $or: [
                    { email: { $regex: TEST_EMAIL_PREFIX } },
                    { email: { $regex: `new${TEST_EMAIL_PREFIX}` } }
                ]
            });

            console.log('Creating test users...');
            // Create test users in batches to avoid overwhelming the database
            const batchSize = 10;
            for (let i = 0; i < NUM_USERS; i += batchSize) {
                const batchPromises = [];
                for (let j = i; j < Math.min(i + batchSize, NUM_USERS); j++) {
                    const user = new User({
                        name: `Load Test User ${j}`,
                        email: `${TEST_EMAIL_PREFIX}${j}@test.com`,
                        password: TEST_PASSWORD,
                        role: 'user',
                        age: 20
                    });
                    batchPromises.push(user.save());
                }
                const batchResults = await Promise.all(batchPromises);
                testUsers = testUsers.concat(batchResults);
                console.log(`Created ${batchResults.length} test users (${testUsers.length}/${NUM_USERS} total)`);
            }
        } catch (error) {
            console.error('Error in beforeAll:', error);
            throw error;
        }
    }, TEST_TIMEOUT);

    afterAll(async () => {
        try {
            console.log('Cleaning up test users...');
            // Delete all test users
            const deleteResult = await User.deleteMany({
                $or: [
                    { email: { $regex: TEST_EMAIL_PREFIX } },
                    { email: { $regex: `new${TEST_EMAIL_PREFIX}` } }
                ]
            });
            console.log(`Deleted ${deleteResult.deletedCount} test users`);

            // Close the database connection
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.close();
                console.log('Database connection closed');
            }
        } catch (error) {
            console.error('Error in afterAll:', error);
            // Ensure connection is closed even if there's an error
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.close();
            }
            throw error;
        }
    }, TEST_TIMEOUT);

    test('should handle 50 concurrent register requests', async () => {
        const startTime = Date.now();
        console.log('Starting concurrent register requests...');

        try {
            const registerPromises = Array.from({ length: NUM_USERS }, (_, index) => 
                axios.post(`${BASE_URL}/users/register`, {
                    name: `New Test User ${index}`,
                    email: `new${TEST_EMAIL_PREFIX}${index}@test.com`,
                    password: TEST_PASSWORD,
                    role: 'user',
                    age: 20
                }).catch(error => {
                    console.error(`register failed for user ${index}:`, error.response?.data || error.message);
                    throw error;
                })
            );

            const results = await Promise.allSettled(registerPromises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Analyze results
            const successfulRegisters = results.filter(r => r.status === 'fulfilled').length;
            const failedRegisters = results.filter(r => r.status === 'rejected').length;
            const failedDetails = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason.response?.data?.message || r.reason.message);

            console.log(`Load Test Results:
            Total Users: ${NUM_USERS}
            Successful Registers: ${successfulRegisters}
            Failed Registers: ${failedRegisters}
            Total Time: ${totalTime}ms
            Average Response Time: ${totalTime / NUM_USERS}ms
            Requests per Second: ${(NUM_USERS / (totalTime / 1000)).toFixed(2)}`);

            if (failedRegisters > 0) {
                console.log('Failed register details:', failedDetails);
            }

            // Assertions
            expect(successfulRegisters).toBe(NUM_USERS);
            expect(failedRegisters).toBe(0);
            expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
        } catch (error) {
            console.error('Error during test execution:', error);
            throw error;
        }
    }, TEST_TIMEOUT);
});