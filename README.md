# 政企供需匹配平台

多省采集 · 智能匹配 · 商机推送

## 在线访问

https://hainan-platform.github.io/presentation/

## 功能特性

- 统计卡片：项目总数、IT类项目、OPC企业数、数据来源数、今日更新
- IT项目专区：紫色高亮区，集中展示IT/数字化项目（信息化建设、数字化转型、人工智能等）
- 行业分布饼图：16+个行业的项目分布
- 来源统计柱图：多省多源数据贡献量
- 项目列表：支持搜索、省份筛选（全部/IT项目/海南省/浙江省/交易中心/发改委）、分页
- 跨源合并标识：同一项目在多个政府来源均有记录时自动标注

## 数据源

### 海南省（5源）
1. 海南省公共资源交易服务中心
2. 海南省发改委
3. 海南省财政厅
4. 海南省政府网站
5. 海南省工信厅

### 浙江省（1源）
6. 浙江省公共资源交易服务平台

## 数据概览

- 项目总数：692 条（海南 392 + 浙江 300）
- IT类项目：73 条
- OPC企业：68 家
- 匹配结果：378 条

## 本地访问

### 方式一：直接打开（最简单）

双击 `index.html` 即可在浏览器中查看，无需任何服务器。

> 注意：部分浏览器可能限制本地 fetch 请求，如页面空白请使用方式二。

### 方式二：本地服务器（推荐）

```bash
# 进入项目目录
cd C:\Users\13995\Desktop\hainan-platform-static

# 启动本地服务器（Python 3）
python -m http.server 8080

# 浏览器访问
# http://localhost:8080
```

按 `Ctrl + C` 停止服务器。

## 数据更新

1. 本地运行数据采集脚本生成 `projects.json`
2. 运行 `generate_data.py` 合并生成 `data.json`（包含项目数组 + 统计信息）
3. 提交并推送到 GitHub：

```bash
cd C:\Users\13995\Desktop\hainan-platform-static
git add .
git commit -m "Update data: YYYY-MM-DD"
git push origin master
```

4. 等待 1-5 分钟，GitHub Pages 自动部署完成

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 静态版 Dashboard 页面（v4.0） |
| `data.json` | 项目数据 + 统计信息（页面直接读取） |
| `projects.json` | 原始项目数据（692条） |
| `.nojekyll` | 禁用 GitHub Pages 的 Jekyll 处理 |
| `README.md` | 本文件 |

## 技术栈

- 前端：HTML + Tailwind CSS + Chart.js 4.4
- 数据格式：JSON（静态文件，无需后端）
- 部署：GitHub Pages
