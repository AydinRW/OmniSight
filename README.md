# 全局视野 (OmniSight)

OmniSight 全局视野：Windows 线性年历桌面应用（Electron）。

- 一年一页：12 个月纵向排列，横向固定 37 列（五个完整星期 + 周一、周二），12 个月复用同一组列，整年单页垂直滚动
- 拖拽绘制事项、Ctrl 多选草稿、跨天 / 跨月事项横条
- 周期批量事项（保持系列关联，可整体编辑 / 删除）
- 按年份分文件夹本地 JSON 存储，重启不丢失

## 运行

```bash
npm install
npm start
```

## 测试

```bash
npm test
```

## 打包便携版 exe

```bash
npm run build
# 产物在 dist/ 目录
```
