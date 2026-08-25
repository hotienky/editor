
import { describe, it } from "vitest"
import { readFileSync } from "fs"
import { OoxmlParser } from "../ooxml-parser"

describe("Inspect Headers & Footers", () => {
  it("check headers in pkg", async () => {
    const parser = new OoxmlParser()
    const buf = readFileSync("/Users/kindy/Downloads/20260401 - LE -001 - HD mua ban Solar.docx")
    const pkg = await parser.parse(new Uint8Array(buf))

    console.log("Headers count:", pkg.headers.size)
    for (const [k, v] of pkg.headers) {
      console.log("Header:", k, "content items:", v.content.length)
      for (const item of v.content) {
        console.log("  Header item:", item.type)
      }
    }

    console.log("Footers count:", pkg.footers.size)
    for (const [k, v] of pkg.footers) {
      console.log("Footer:", k, "content items:", v.content.length)
    }

    console.log("Media count:", pkg.media.size)
    for (const [k, v] of pkg.media) {
      console.log("Media:", k, "bytes:", v.length)
    }
  })
})
