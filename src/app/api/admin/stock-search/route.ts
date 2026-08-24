import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      return NextResponse.json({ error: 'Unsplash API key (UNSPLASH_ACCESS_KEY) is missing in environment variables.' }, { status: 500 });
    }

    // Call Unsplash API
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`;
    
    const response = await fetch(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Unsplash API Error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch from Unsplash' }, { status: response.status });
    }

    const data = await response.json();
    
    // Map to a cleaner format
    const results = data.results.map((img: any) => ({
      id: img.id,
      url: img.urls.regular,        // The URL we will save (good quality)
      thumbnail: img.urls.small,    // For the UI grid
      alt: img.alt_description || 'Stock image',
      author: img.user.name,
      authorUrl: img.user.links.html
    }));

    return NextResponse.json({ results }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching stock images:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
