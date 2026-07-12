import { browser } from 'wxt/browser';

export default defineBackground(() => {
  async function configureSidePanel() {
    if (!browser.sidePanel) {
      console.warn('当前浏览器不支持 Side Panel API');
      return;
    }

    try {
      await browser.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      });
    } catch (error) {
      console.error('配置侧边栏失败：', error);
    }
  }

  // 插件第一次安装或更新时执行
  browser.runtime.onInstalled.addListener(() => {
    void configureSidePanel();
  });

  // 浏览器启动、后台重新运行时执行
  browser.runtime.onStartup.addListener(() => {
    void configureSidePanel();
  });

  // 开发环境重新加载扩展时也立即执行
  void configureSidePanel();
});