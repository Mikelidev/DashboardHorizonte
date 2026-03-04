import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let targetUrl = '';
    if (type === 'animales') {
        targetUrl = process.env.NEXT_PUBLIC_SHEET_ANIMALES_URL || '';
    } else if (type === 'eventos') {
        targetUrl = process.env.NEXT_PUBLIC_SHEET_EVENTOS_URL || '';
    }

    if (!targetUrl) {
        return NextResponse.json({ error: 'URL not configured in environment' }, { status: 500 });
    }

    try {
        const res = await fetch(targetUrl, {
            cache: 'no-store',
            redirect: 'follow'
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Failed to fetch from Google Sheets: ${res.statusText}` }, { status: res.status });
        }

        const text = await res.text();

        // Set permissive CORS headers just in case
        return new NextResponse(text, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
