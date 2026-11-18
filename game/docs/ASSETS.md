# 美术资产

本项目运行时只加载项目内的本地文件，不依赖图片热链、CDN 或在线字体。

## 原创环境图

- 文件：`public/assets/world-tree.webp`
- 工具：内置 `image_gen.imagegen`，经 `imagegen` skill 指导使用，非 CLI / API key 工作流。
- 生成日期：2026-11-17。
- 用途：旧版共用背景，保留为未设置章节主题时的 CSS 后备。
- 原图从工具生成目录复制到项目内；不依赖生成目录继续存在。
- 没有下载或挪用原神、杀戮尖塔的游戏贴图。

完整生成提示词：

```text
Use case: stylized-concept. Asset type: original wide environment background for a browser fantasy deck-building roguelike, no UI. Primary request: a magnificent ancient luminous world tree growing in a silent flooded ruined sanctuary, immense pale ivory tree trunk on the left third, arching tangled roots, turquoise emerald mist, dark forest framing, a tiny indistinct caped traveler standing on a round stone causeway lower center, distant broken stone arches and hanging ruins, drifting glowing pollen. Style: exquisite painterly fantasy environment concept art, fine engraved details, atmospheric perspective, editorial fine art, restrained and sophisticated. Composition: panoramic 16:9 landscape, great sense of scale, right half is open mist and distant architecture with low contrast for overlaying a branching game map, luminous tree canopy upper left, dark teal vignette at edges, muted gold flecks. Color palette deep ink green, petrol teal, desaturated mint, warm ivory, antique champagne gold. Lighting: celestial diffused shafts of light through tree branches, dreamlike and quiet. Constraints: original fictional scene, no recognizable existing game characters or copyrighted logos, NO TEXT, NO LETTERS, no interfaces, no cards, no borders. Landscape aspect ratio.
```

## 程序绘制

| 文件 / 入口 | 内容 |
| --- | --- |
| `public/assets/mark.svg` | 项目标记与网站图标 |
| `public/assets/traveler.svg` | 原创披风剑士符号形象 |
| `public/assets/enemy.svg` | 原创晶体守卫符号形象 |
| `public/src/app.js → art()` | 九种元素卡牌 / 助战 / 圣遗物纹章 |
| `public/src/app.js → icon()` | 统一线宽的界面图标 |
| `public/src/fx.js + styles.css 动效段` | 战斗动效叠加层：浮动数字、粒子爆发、反应 / 回合 / 胜负横幅、震屏、卡影飞行、入场交错；纯 CSS 关键帧 + Web Animations API，无外部依赖 |
| `public/styles.css` | 光晕、路线、几何装饰、卡框与背景蒙层 |

代码图形与栅格插画职责不同：可交互图标用可编辑 SVG，环境用生成插画。

字体使用系统已有的宋体 / 思源宋体系列与微软雅黑等后备，不拉取网络字体。交互音效由 Web Audio 实时合成，默认关闭，没有外部音频文件。

后续可在保持 UI 界面的前提下逐章增加环境、角色与首领图。若更换图像，保留当前文件作为备选版本并更新来源记录。


## 八章环境占位图（2026-11-17）

由内置 `image_gen.imagegen` 分别生成并复制到 `public/assets/chapters/`；路线、战斗与奇遇共用本章对应插画，界面叠加相应章节底色和可读性蒙层。各文件可独立替换。九种元素图标为 `public/assets/elements.svg` 内的原创 SVG 符号，界面中不使用 emoji 元素图标。

### 格式与体积（2026-11-18）

所有章节背景与 `world-tree` 已从 PNG 转为 WebP（`libwebp`，`-q:v 82`，`-preset picture`，`-compression_level 6`，`yuv420p`），尺寸与构图不变。单张从约 2 MB 降到 90–280 KB，八章合计从 18.2 MB 降到 1.4 MB，PSNR 均高于 41 dB，配合界面蒙层后无可感知差异。重新导出原图后用以下命令再生成：

```bash
ffmpeg -i chapters/<name>.png -c:v libwebp -lossless 0 -q:v 82 \
  -compression_level 6 -preset picture -pix_fmt yuv420p chapters/<name>.webp
```

`server.mjs` 已登记 `.webp` 的 MIME 类型，无需额外配置。

每张图的完整提示词：

- `mondstadt.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. Wind-swept green meadows and distant medieval windmills on a lakeside, soft cyan skies, an ancient luminous tree in the distance. Painterly storybook concept art, atmospheric depth, muted teal and moss palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `liyue.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. Towering golden karst mountains and an ancient East Asian harbor on a misty lake at dusk, tiny lantern lights, layered silhouettes. Painterly storybook concept art, atmospheric depth, muted amber and jade palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `inazuma.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. A storm-wreathed island with Japanese-inspired roofs, distant shrine gate and purple lightning over the sea, petals drifting. Painterly storybook concept art, atmospheric depth, muted violet and indigo palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `sumeru.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. Lush ancient rainforest with enormous roots, a scholarly city beneath giant trees and distant sandy cliffs, motes of light. Painterly storybook concept art, atmospheric depth, muted emerald and golden-green palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `fontaine.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. Elegant fantasy city of canals and waterfalls with glass domes, aqueducts and pale ornate architecture on a blue lake. Painterly storybook concept art, atmospheric depth, muted sapphire and silver palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `natlan.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. Volcanic mountains, warm red mesas, glowing lava rivers and an ancient stone settlement under a dramatic sunset sky. Painterly storybook concept art, atmospheric depth, muted crimson and ember palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `nodkrai.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. A northern frontier of dark pine forest, weathered stone ruins, moonlit lake and strange aurora shimmering above cold mountains. Painterly storybook concept art, atmospheric depth, muted moonlit turquoise and deep blue palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
- `snezhnaya.webp`: Use case: stylized-concept. Create one widescreen background illustration for a fantasy card game chapter, landscape composition. Snow-covered northern imperial city, onion-domed towers, icy pines and mountains under a luminous winter twilight, falling snow. Painterly storybook concept art, atmospheric depth, muted icy blue and silver palette, center kept readable for overlaid interface. No people, characters, logos, writing, frames or UI.
