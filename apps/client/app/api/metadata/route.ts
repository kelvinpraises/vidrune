import { NextResponse } from "next/server";
import { db as dbFactory } from "../../../library/db";

// Create a DB instance
const db = dbFactory();

// GET handler to retrieve all metadata records
export async function GET() {
  try {
    const metadata = await db
      .selectFrom("metadata")
      .selectAll()
      .orderBy("createAt", "desc")
      .execute();
    
    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
} 