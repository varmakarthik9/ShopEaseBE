// PDF Generator for Analytics
export class PDFGenerator {
    constructor() {
        console.log('Initializing PDFGenerator...');
        try {
            // Create the worker script
            const workerScript = `
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js');

                self.onmessage = async (e) => {
                    console.log('Worker received message:', e.data);
                    const { chartsData } = e.data;
                    
                    try {
                        if (!chartsData) {
                            throw new Error('No chart data received');
                        }

                        console.log('Initializing jsPDF...');
                        const { jsPDF } = self.jspdf;
                        if (!jsPDF) {
                            throw new Error('jsPDF library not loaded');
                        }

                        const doc = new jsPDF();
                        
                        // Add title
                        doc.setFontSize(20);
                        doc.text('Product Sales Analytics Report', 20, 20);
                        
                        // Add date
                        doc.setFontSize(12);
                        doc.text(\`Generated on: \${new Date().toLocaleDateString()}\`, 20, 30);
                        
                        // Add top products chart
                        if (chartsData.topProducts && chartsData.topProducts.length > 0) {
                            console.log('Adding top products section...');
                            doc.setFontSize(16);
                            doc.text('Top Selling Products', 20, 50);
                            doc.setFontSize(12);
                            
                            const topProductsTable = chartsData.topProducts.map(product => [
                                product.label,
                                product.value,
                                \`\$\${product.value.toFixed(2)}\`
                            ]);
                            
                            doc.autoTable({
                                startY: 60,
                                head: [['Product', 'Quantity', 'Revenue']],
                                body: topProductsTable,
                                theme: 'grid',
                                headStyles: { fillColor: [78, 115, 223] }
                            });
                        }
                        
                        // Add category sales
                        if (chartsData.categorySales && chartsData.categorySales.length > 0) {
                            console.log('Adding category sales section...');
                            doc.setFontSize(16);
                            doc.text('Sales by Category', 20, doc.lastAutoTable.finalY + 20);
                            doc.setFontSize(12);
                            
                            const categorySalesTable = chartsData.categorySales.map(category => [
                                category.label,
                                \`\$\${category.value.toFixed(2)}\`
                            ]);
                            
                            doc.autoTable({
                                startY: doc.lastAutoTable.finalY + 30,
                                head: [['Category', 'Revenue']],
                                body: categorySalesTable,
                                theme: 'grid',
                                headStyles: { fillColor: [78, 115, 223] }
                            });
                        }
                        
                        // Add monthly sales trend
                        if (chartsData.monthlySales && chartsData.monthlySales.length > 0) {
                            console.log('Adding monthly sales section...');
                            doc.setFontSize(16);
                            doc.text('Monthly Sales Trend', 20, doc.lastAutoTable.finalY + 20);
                            doc.setFontSize(12);
                            
                            const monthlySalesTable = chartsData.monthlySales.map(month => [
                                month.label,
                                \`\$\${month.value.toFixed(2)}\`
                            ]);
                            
                            doc.autoTable({
                                startY: doc.lastAutoTable.finalY + 30,
                                head: [['Month', 'Revenue']],
                                body: monthlySalesTable,
                                theme: 'grid',
                                headStyles: { fillColor: [78, 115, 223] }
                            });
                        }
                        
                        // Add summary
                        console.log('Adding summary section...');
                        doc.setFontSize(16);
                        doc.text('Summary', 20, doc.lastAutoTable.finalY + 20);
                        doc.setFontSize(12);
                        
                        const totalRevenue = chartsData.monthlySales?.reduce((sum, month) => sum + month.value, 0) || 0;
                        const totalProducts = chartsData.topProducts?.reduce((sum, product) => sum + product.value, 0) || 0;
                        
                        doc.text(\`Total Revenue: \$\${totalRevenue.toFixed(2)}\`, 20, doc.lastAutoTable.finalY + 30);
                        doc.text(\`Total Products Sold: \${totalProducts}\`, 20, doc.lastAutoTable.finalY + 40);
                        
                        console.log('Generating PDF blob...');
                        const pdfBlob = doc.output('blob');
                        
                        console.log('Sending PDF blob back to main thread...');
                        self.postMessage({ success: true, pdfBlob });
                    } catch (error) {
                        console.error('Error in worker:', error);
                        self.postMessage({ success: false, error: error.message });
                    }
                };
            `;

            const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(workerBlob);
            
            this.worker = new Worker(workerUrl);
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.reject(new Error('Worker error: ' + error.message));
            };
        } catch (error) {
            console.error('Error initializing worker:', error);
            throw error;
        }
    }

    generatePDF() {
        console.log('Starting PDF generation...');
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            
            try {
                const chartsData = {
                    topProducts: this.getChartData('topProductsChart'),
                    categorySales: this.getChartData('categorySalesChart'),
                    monthlySales: this.getChartData('monthlySalesChart')
                };

                console.log('Chart data:', chartsData);

                if (!chartsData.topProducts.length && !chartsData.categorySales.length && !chartsData.monthlySales.length) {
                    throw new Error('No chart data available. Please make sure the charts are loaded.');
                }
                
                // Send data to worker
                this.worker.postMessage({ chartsData });
            } catch (error) {
                console.error('Error preparing chart data:', error);
                reject(error);
            }
        });
    }

    handleWorkerMessage(event) {
        console.log('Worker message received:', event.data);
        if (event.data.success) {
            this.resolve(event.data.pdfBlob);
        } else {
            this.reject(new Error(event.data.error));
        }
    }

    getChartData(chartId) {
        console.log(`Getting data for chart: ${chartId}`);
        const chart = Chart.getChart(chartId);
        if (!chart) {
            console.warn(`Chart ${chartId} not found`);
            return [];
        }

        const dataset = chart.data.datasets[0];
        if (!dataset || !dataset.data) {
            console.warn(`No data found for chart ${chartId}`);
            return [];
        }

        const data = chart.data.labels.map((label, index) => ({
            label,
            value: dataset.data[index]
        }));

        console.log(`Data for ${chartId}:`, data);
        return data;
    }

    downloadPDF(blob) {
        if (!blob) {
            console.error('No PDF blob received');
            return;
        }
        console.log('Downloading PDF...');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
} 