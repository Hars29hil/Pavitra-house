import React, { useCallback } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Student } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateAge } from '@/lib/dateUtils';

interface BulkUpdateProps {
    students: Student[];
    onUpdate: (students: Student[]) => void;
}

export const BulkUpdate = ({ students, onUpdate }: BulkUpdateProps) => {
    const handleDownload = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Students');

        // Exclude 'id' and 'createdAt' fields from export
        const excludedFields = ['id', 'createdAt'];

        // Dynamically create columns from the first student object if available
        if (students.length > 0) {
            worksheet.columns = Object.keys(students[0])
                .filter((key) => !excludedFields.includes(key))
                .map((key) => ({
                    header: key,
                    key: key,
                    width: 20, // Set a default width for better readability
                }));
        }

        // Add rows with excluded fields removed
        const rowsData = students.map(student => {
            const row: any = {};
            Object.keys(student).forEach(key => {
                if (!excludedFields.includes(key)) {
                    row[key] = student[key as keyof Student];
                }
            });
            return row;
        });
        worksheet.addRows(rowsData);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Create blob and save
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'hostel_students_data.xlsx');

        toast.success("Excel file downloaded successfully");
    };

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            toast.error("Please upload a valid Excel file (.xlsx or .xls)");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const buffer = evt.target?.result as ArrayBuffer;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);

                const worksheet = workbook.getWorksheet(1);

                if (!worksheet) {
                    toast.error("The uploaded file is empty or invalid");
                    return;
                }

                // Convert worksheet to JSON manually
                const data: any[] = [];
                const headers: string[] = [];

                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) {
                        // Capture headers
                        row.eachCell((cell, colNumber) => {
                            headers[colNumber] = String(cell.value);
                        });
                    } else {
                        // Capture data
                        const rowData: any = {};
                        let hasData = false;
                        // Helper to safely extract cell value
                        const getCellValue = (cell: ExcelJS.Cell): any => {
                            const value = cell.value;

                            if (value && typeof value === 'object') {
                                // Handle formula cells
                                if ('formula' in value) {
                                    // If result is available, use it (check for undefined to strictly verify existence)
                                    if ((value as any).result !== undefined) {
                                        return (value as any).result;
                                    }
                                    // Fallback for simple boolean formulas (common in some Excel exports)
                                    const formula = (value as any).formula;
                                    if (formula === 'FALSE()') return false;
                                    if (formula === 'TRUE()') return true;

                                    // If we can't resolve the value, return null to avoid sending an object to the DB
                                    return null;
                                }
                                // Handle hyperlink cells
                                if ('text' in value) {
                                    return (value as any).text;
                                }
                                // Handle rich text cells
                                if ('richText' in value && Array.isArray((value as any).richText)) {
                                    return (value as any).richText.map((rt: any) => rt.text).join('');
                                }
                            }

                            return value;
                        };

                        row.eachCell((cell, colNumber) => {
                            const header = headers[colNumber];
                            if (header) {
                                rowData[header] = getCellValue(cell);
                                hasData = true;
                            }
                        });
                        if (hasData) {
                            data.push(rowData);
                        }
                    }
                });

                if (data.length === 0) {
                    toast.error("The uploaded file is empty");
                    return;
                }

                // Auto-generate id, createdAt, and calculate age for each student
                const processedData = data.map((student) => {
                    // Calculate age from DOB if DOB is provided
                    const age = student.dob ? calculateAge(student.dob) : (student.age || 0);

                    return {
                        ...student,
                        id: crypto.randomUUID(), // Generate unique ID
                        createdAt: new Date().toISOString(), // Set current timestamp
                        age: age, // Auto-calculated age from DOB
                    };
                });

                onUpdate(processedData as Student[]);
                toast.success(`Successfully loaded ${processedData.length} students records`);
            } catch (error) {
                console.error("Excel processing error:", error);
                toast.error("Failed to process Excel file");
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset input value to allow uploading same file again
        e.target.value = '';
    }, [onUpdate]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
                    <div className="w-16 h-16 gradient-success rounded-2xl flex items-center justify-center shrink-0 shadow-soft">
                        <FileSpreadsheet className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">Excel Integration</h3>

                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <Button
                        variant="outline"
                        className="h-auto py-8 flex flex-col items-center gap-4 glass-card border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 rounded-3xl transition-all group shadow-soft hover:shadow-soft-lg"
                        onClick={handleDownload}
                    >
                        <div className="p-4 gradient-primary rounded-2xl group-hover:scale-110 transition-transform shadow-soft">
                            <Download className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                            <span className="font-extrabold text-lg block text-foreground">Extract Data</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 block">Download current database</span>
                        </div>
                    </Button>

                    <div className="relative group">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <Button
                            variant="outline"
                            className="w-full h-full py-8 flex flex-col items-center justify-center gap-4 glass-card border-2 border-dashed border-success/30 hover:border-success/50 hover:bg-success/5 rounded-3xl transition-all shadow-soft hover:shadow-soft-lg"
                        >
                            <div className="p-4 gradient-success rounded-2xl group-hover:scale-110 transition-transform shadow-soft">
                                <Upload className="w-8 h-8 text-white" />
                            </div>
                            <div className="text-center">
                                <span className="font-extrabold text-lg block text-foreground">Import List</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 block">Upload edited template</span>
                            </div>
                        </Button>
                    </div>
                </div>

                <div className="glass-card border-primary/10 p-6 rounded-3xl space-y-4">
                    <p className="font-bold text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full gradient-primary" />
                        Optimization Guidelines
                    </p>
                    <ul className="space-y-3 text-sm font-medium text-muted-foreground">
                        <li className="flex items-start gap-4">
                            <span className="w-6 h-6 rounded-lg glass border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 text-primary">01</span>
                            <span><strong className="text-foreground">ID</strong> and <strong className="text-foreground">Creation Date</strong> are auto-generated - no need to include them.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg glass border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 text-primary">02</span>
                            <span>Fill in all other student details in the downloaded template.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg glass border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 text-primary">03</span>
                            <span>Maintain dates in the <strong className="text-foreground">YYYY-MM-DD</strong> standard format.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
