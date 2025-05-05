import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get('since');
    const lang = searchParams.get('lang');

    const apiUrl = new URL('https://github-trending-iota.vercel.app/repo');
    if (since) apiUrl.searchParams.append('since', since);
    if (lang) apiUrl.searchParams.append('lang', lang);

    console.log('Proxying request to:', apiUrl.toString());

    // Create a custom HTTPS agent with specific configurations
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // 允许不安全的证书
      keepAlive: true,
      timeout: 10000,
      family: 4, // 强制使用 IPv4
    });

    const response = await axios.get(apiUrl.toString(), {
      httpsAgent,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://github-trending-iota.vercel.app',
        'Referer': 'https://github-trending-iota.vercel.app/'
      },
      timeout: 10000,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch trending repositories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 