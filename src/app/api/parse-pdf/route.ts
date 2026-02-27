import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Promise wrapper for pdf2json
        const extractText = (): Promise<string> => {
            return new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true);

                pdfParser.on('pdfParser_dataError', (errData: any) => reject(new Error(errData.parserError)));
                pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
                    resolve(pdfParser.getRawTextContent());
                });

                pdfParser.parseBuffer(buffer);
            });
        };

        const rawText = await extractText();

        if (!rawText || rawText.trim().length === 0) {
            return NextResponse.json(
                { error: 'Failed to extract text. The PDF might be scanned or protected.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ text: rawText });
    } catch (error: any) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json(
            { error: 'An error occurred while parsing the PDF.', details: error.message },
            { status: 500 }
        );
    }
}
