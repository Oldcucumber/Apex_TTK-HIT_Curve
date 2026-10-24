
# Apex 数据分析工具

这个项目提供了一个用于分析《Apex Legends》游戏中武器 **数据分析** 的工具。该项目旨在帮助玩家更好地理解武器性能，并挑选适合自己的武器。

-----

## 使用方法

你可以拉取这个项目到本地然后使用 `yarn` 本地部署。
你也可以直接使用 GitHub Pages 提供的[在线版本](https://oldcucumber.github.io/Apex_TTK-HIT_Curve/)。
如果你的网络环境不允许您方便地访问 GitHub Pages，你可以使用[apex.zju.wiki](https://apex.zju.wiki/)来访问。

-----

## 页面

| 页面 | 内容 |
| :--- | :--- |
| 总览 | 全部武器的数据表（战斗 / 容错 / 操控三组列），可按类型筛选、搜索、排序；点击一行查看详情，可按护甲等级切换 TTK |
| 探索 | 任意两项指标的散点图（支持对数轴），或任意指标的排行条形图 |
| 对比 | 选择 2–4 把武器，雷达图 + 逐项数据对比 |
| 命中率 | 命中率-TTK 曲线，以及命中率自测（可导入/导出 JSON） |

界面支持浅色 / 深色主题和中文 / English（默认跟随浏览器语言），选择会被记住；手机上使用底部导航。

## 数据更新

唯一的数据源是 `src/data/weapons.json`（社区 xlsx 的 `数据表2.0` 工作表，由脚本生成）：59 条武器状态的伤害、TTK、TTM、换弹、移速、操控等，含中英文名称和稳定的 `key`。

命中率曲线不再单独维护，而是在 `src/data/curves.js` 中由同一份数据推算（紫甲）：击杀需要 N 发命中，k 次未命中时命中率 = N/(N+k)，TTK = 满命中 TTK + k × 射击间隔，直到紫弹匣打空。技能、伤害随距离变化的武器（L-STAR、充能步枪）和榴弹没有曲线。

更新 `weapons.json`：

```bash
python3 scripts/xlsx_to_weapons.py 老葛你又在打电动-APEX枪械数据.xlsx
```

脚本只依赖 Python 标准库；英文名称在 `scripts/names_en.json` 中维护，缺少翻译时脚本会列出。界面文字在 `src/i18n/locales/` 下。

-----

## Contributors

感谢所有为本项目做出贡献的开发者！感谢你们的付出与劳动！

-----

### 贡献者列表

以下是为本项目做出贡献的贡献者们（按贡献时间顺序排列）：

| GitHub 用户名 | 贡献类型            | GitHub 个人主页                                       | 社交媒体                                             |
| :------------ | :------------------ | :---------------------------------------------------- | :--------------------------------------------------- |
| Oldcucumber   | 项目管理            | [GitHub Profile](https://github.com/Oldcucumber)      | [Bilibili@旋转突击蓝色胡瓜](https://space.bilibili.com/121923053) |
| Rebel-Gloria  | 前端开发            | [GitHub Profile](https://github.com/Rebel-Gloria)     | [Bilibili@固源岩组](https://space.bilibili.com/36231839) |
| StarVerseZ    | 前端开发            | [GitHub Profile](https://github.com/StarVerseZ)       | [暂无]                                               |
| passby6someone| 前端开发            | [GitHub Profile](https://github.com/passby6someone)   | [暂无]                                               |

-----

## 特别鸣谢

我们还要感谢以下组织和个人，他们通过提供资源、工具或宝贵的建议间接支持了本项目：

  * **[老葛你又在打电动@Bilibili](https://space.bilibili.com/25435445)**
      * 没有他提供的[原始数据](https://www.bilibili.com/video/BV1kMVRzkEst)和[思路](https://www.bilibili.com/video/BV1MHLPzUE1D)，就不会有这个项目。

-----

## 如何贡献
我们非常欢迎并鼓励各位贡献者参与到本项目中来！无论是提交 Bug 报告、提出新功能建议、改进文档，还是编写代码，您的每一份贡献都至关重要。

#### 您可以：

##### 报告 Bug：如果您在使用过程中发现任何问题或 Bug，请访问我们的 GitHub Issues 页面 提交详细的 Bug 报告。
##### 提交功能请求：如果您有任何新功能或改进的建议，也请在 GitHub Issues 页面 提出您的想法。

###### 如果您想为项目贡献代码，请按照以下步骤操作：

##### 提交代码：
首先，请 Fork 本项目的仓库到您的 GitHub 账户。
在您的 Fork 仓库中进行代码修改和功能开发。
请务必在本地充分测试您的修改，确保其功能完善且没有引入新的问题。
完成修改后，请向本项目提交一个 Pull Request (PR)。在 PR 中，请详细说明您的修改内容、提供修改前后的效果图（如有必要），并附上任何相关的文档。特别提醒：请确保您的代码遵守所使用库的开源许可协议。如果您的修改引入了新的依赖，请务必在 PR 中主动注明。

-----

### 成为贡献者

如果您想成为贡献者并在此处列出您的名字，请参阅上面的“如何贡献”部分。您的努力将帮助我们使这个项目变得更好！

-----

## 许可证

### 本项目基于 GPL-3.0 协议开源，请遵守协议。数据来源（Json 文件）为[老葛你又在打电动@Bilibili](https://space.bilibili.com/25435445)提供，这部分不属于本项目。如果您需要使用这部分数据，请联系[老葛你又在打电动@Bilibili](https://space.bilibili.com/25435445)。