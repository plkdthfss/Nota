# 项目相关
开发顺序？
1. 创建 WXT + Vue + TS 项目
2. 跑通 npm run dev
3. 建 sidepanel 入口
4. 让 Vue 页面显示在侧边栏
5. 设置点击插件图标打开侧边栏
6. 安装 Pinia
7. 初始化 appStore
8. 安装 Dexie
9. 初始化数据库表
10. 安装 Tiptap Vue 依赖
11. 跑通一个最小 Tiptap 编辑器
12. 加 Markdown 扩展
13. 加固定工具栏
14. 加 BubbleMenu 浮动工具栏
15. 加自动保存
16. 加笔记库、搜索、文件夹



# WXT相关
package.json
    ↓
决定使用哪些依赖、运行哪些命令

wxt.config.ts
    ↓
决定如何构建扩展、启用哪些模块、声明哪些权限

entrypoints/
    ↓
决定扩展具体有哪些功能入口

Manifest 是由 wxt.config.ts、入口配置、WXT 模块和构建钩子共同生成的

**wxt流程**：
1. Node 读取 package.json
             ↓
2. 执行 wxt 命令
             ↓
3. WXT 读取 wxt.config.ts
             ↓
4. 加载 @wxt-dev/module-vue
             ↓
5. 扫描 entrypoints/
             ↓
6. 识别 background、content、popup
             ↓
7. 根据入口配置生成 manifest.json
             ↓
8. 使用 Vite 编译 TS、Vue、CSS 和资源
             ↓
9. 输出开发版扩展
             ↓
10. 打开浏览器并加载扩展

# 插件开发相关

## 普通网站
浏览器
  └─ Vue 单页应用
       └─ 调用 Java 后端
====》 前端后端数据怎么传输？

## chrome
content script：操作网页
```
export default defineContentScript({
  matches: ['https://github.com/*'],

  main() {
    console.log('当前网页标题：', document.title);

    document.body.style.outline = '4px solid orange';
  },
});
```
background script：类似后端（但是空闲时会终止，所以全局变量可能会丢失）


