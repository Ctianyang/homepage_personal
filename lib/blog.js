import path from "path";
import fs from "fs";
import matter from "gray-matter";
import remarkParse from "remark-parse"
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import "../public/katex/katex.min.css"

const rootDirectory = path.join(process.cwd(), "content", "blog");

export async function getBlogBySlug(serie, slug) {
  // 文件路径加入serie
  const filePath = path.join(rootDirectory, serie, `${slug}.md`);
  // decode处理非ASCII字符，中文空格等
  const fileContent = fs.readFileSync(decodeURI(filePath), { encoding: "utf-8" });

  const { data, content } = matter(fileContent);
  const processedContent = await unified()
    // 解析md及公式
    .use(remarkParse)
    .use(remarkMath)
    // 转为html ATS
    .use(remarkRehype)
    // 渲染公式，需要引入相应的css
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(content)

  const contentHtml = processedContent.toString();
  // 直接导出html，所以content->contentHtml，metadata元数据不受影响
  return { metadata: { ...data, slug }, contentHtml };
}

// 递归遍历所有文件夹，获取所有文件
function getFiles(dirPath) {
  let fileList = [];
  const files = fs.readdirSync(dirPath);

  files.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isFile()) {
      fileList.push(fullPath);
    } else if (stats.isDirectory()) {
      fileList = fileList.concat(getFiles(fullPath));
    }
  });
  return fileList;
}

export async function getBlogs() {
  let files = getFiles(rootDirectory);

  const posts = files
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      file = file.split('blog\\')[1]
      return getBlogMetadata(file)
    })
    .sort((a, b) =>
      new Date(a.publishedAt ?? "") < new Date(b.publishedAt ?? "") ? 1 : -1
    );
  return posts;
}

export function getBlogMetadata(filepath) {
  let slug = filepath.replace(/\.md$/, "")

  const filePath = path.join(rootDirectory, filepath);
  const fileContent = fs.readFileSync(decodeURI(filePath), { encoding: "utf8" });
  const { data } = matter(fileContent);
  return { ...data, slug };
}

// 获取某个系列中的所有博客
export async function getBlogsBySerie(serie) {
  const decodedSerie = decodeURIComponent(serie)
  const filePath = path.join(rootDirectory, decodedSerie);
  const files = fs.readdirSync(filePath);

  const posts = files
    .map((file) => {
      file = path.join(decodedSerie, file);
      return getBlogMetadata(file)
    })
    .sort((a, b) =>
      new Date(a.publishedAt ?? "") < new Date(b.publishedAt ?? "") ? 1 : -1
    );
  return posts;
}