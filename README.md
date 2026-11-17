# 世界树回响 · IRMINSUL

元素反应 + 卡组构筑的网页端 Roguelike。纯前端（HTML / CSS / 原生 ES Module），无第三方运行依赖，存档保存在浏览器 `localStorage`。

**在线游玩：<https://rayafriandion.github.io/ys-sjshx/>**

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `game/` | 游戏本体：引擎、界面、内容、资源、测试与本地静态服务器 |
| `game/public/` | 实际发布的静态站点（GitHub Pages 的产物目录） |
| `gdd.md` | 游戏设计文档 |
| `event-carddatabase.md` | 事件与卡牌资料库 |
| `game/docs/` | 资料研究、美术来源与 QA 边界说明 |

## 本地运行

需要 Node.js 22 或更高版本，无需 `npm install`。

```powershell
cd game
npm start          # http://127.0.0.1:4173
npm run dev        # 服务自动重启
npm run check      # 规则 / 存档 / 静态服务测试 + 内容槽位检查
```

## 部署

推送到 `main` 分支即触发 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)：

1. 安装 Node 22，在 `game/` 执行 `npm run check`，测试不过则不发布；
2. 把 `game/public` 作为静态产物上传到 GitHub Pages。

因此本地与线上跑的是同一份文件，区别只有站点根路径（本地 `/`，Pages `/ys-sjshx/`）。前端所有资源引用均为相对路径，两条路径都能正常工作 —— 修改资源路径时请继续使用 `./assets/...`，不要写成 `/assets/...`。

## 存档说明

- 存档在浏览器本地，按域名隔离：`127.0.0.1:4173` 与线上站点各自独立，互不同步。
- 3 个槽位，每槽保留前一次有效存档作为备份，支持 JSON 导出 / 导入。
- 清除站点数据会一并清除存档，建议定期导出备份。

## 许可

美术资源为项目自制 / 程序生成，来源与提示词见 `game/docs/ASSETS.md`。本仓库尚未附带开源许可证，默认保留所有权利；如需允许他人复用，请补充 `LICENSE` 文件。
