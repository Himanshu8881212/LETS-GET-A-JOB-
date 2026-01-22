import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Call n8n workflow
        const n8nResponse = await fetch('http://n8n:5678/webhook/tailor-cover-letter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!n8nResponse.ok) {
            throw new Error(`n8n workflow failed with status: ${n8nResponse.status}`);
        }

        const data = await n8nResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error tailoring cover letter:', error);
        return NextResponse.json(
            { error: 'Failed to tailor cover letter' },
            { status: 500 }
        );
    }
}
