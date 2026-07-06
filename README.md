# 路刻 App

一个面向小红书/抖音旅行内容复刻的路线规划 App 原型。

核心能力：

- 粘贴文案或链接后识别景点并生成路线
- 接入高德地图能力，支持地点检索、路线规划和周边 POI
- 路线页联动拍照机位、动作参考和同款照片建议
- 按路线实时推荐美食补给
- 支持截图 OCR 和用户修正学习

## 本地运行

```bash
pnpm install
pnpm build
pnpm serve
```

默认访问：

```text
http://127.0.0.1:5174/
```

## 环境变量

复制 `.env.example` 为 `.env.local`，然后填入自己的高德地图 Key。

```text
VITE_AMAP_KEY=你的高德地图Key
AMAP_KEY=你的高德地图Key
```

`.env.local` 不会上传到 GitHub。
