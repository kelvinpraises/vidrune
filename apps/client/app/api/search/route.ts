import { NextRequest, NextResponse } from "next/server";
import { db as dbFactory } from "@/db";
import initVideoSearchEngine from "@/library/utils/videarch";

// Create a DB instance
const db = dbFactory();

// Initialize the search engine
let searchEnginePromise: ReturnType<typeof initVideoSearchEngine> | null = null;

const getSearchEngine = async () => {
  if (!searchEnginePromise) {
    searchEnginePromise = initVideoSearchEngine(db);
  }
  return searchEnginePromise;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const searchEngine = await getSearchEngine();
    if (!searchEngine) {
      throw new Error("Failed to initialize search engine");
    }
    
    const results = await searchEngine.search(query, limit);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
