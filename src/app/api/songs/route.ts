import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";


const coverMap: Record<string, string> = {
  "09": "/covers/opposition.png",
  "19": "/covers/opposition.png",
  "06": "/covers/hole.png",
  "16": "/covers/hole.png",
  "03": "/covers/bot.png",
  "04": "/covers/bot.png",
  "05": "/covers/bot.png",
  "13": "/covers/bot.png",
  "14": "/covers/bot.png",
  "15": "/covers/bot.png",
  "10": "/covers/blaza.png",
  "20": "/covers/blaza_result.png",
  "garden_theme": "/covers/garden_theme.jpg",
};

const audioDir = path.join(process.cwd(), "public/audio");
const files = fs.readdirSync(audioDir).filter((file) => file.endsWith(".mp3"));

export async function GET() {
  const songs = files.map((file) => {
    const baseName = file.replace(".mp3", "");
    const match = baseName.match(/^(\d+)_?(.+)?$/);
    const trackNumber = match ? match[1] : null;
    const trackName = match && match[2] ? match[2] : baseName;


    const cover =
      (trackNumber && coverMap[trackNumber]) ||
      coverMap[trackName] ||
      `/covers/${baseName}.jpg`;

    return {
      title: baseName,
      file: `/audio/${file}`,
      cover,
    };
  });

  return NextResponse.json(songs);
}
