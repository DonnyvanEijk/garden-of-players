import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const audioDir = path.join(process.cwd(), "public/audio");
const files = fs.readdirSync(audioDir).filter((file) => file.endsWith(".mp3"));

export async function GET() {
  const songs = files.map((file) => ({
    title: file.replace(".mp3", ""),
    file: `/audio/${file}`,
    cover: `/covers/${file.replace(".mp3", ".jpg")}`,
  }));

  return NextResponse.json(songs);
}
