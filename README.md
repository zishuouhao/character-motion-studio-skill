# Character Motion Studio Skill

用于把 2–10 个 SVG 或已命名的 Figma Frames 制作成角色状态动画。

## 安装

在 Codex或任意AI工具 中发送：

请使用 skill-installer 安装这个 GitHub Skill：
https://github.com/zishuouhao/character-motion-studio-skill/tree/main/character-motion-studio

## 调用

1.最简单的调用方式：

$character-motion-studio
请把我上传的这些 SVG 按顺序做成角色状态动画，最后输出可编辑 HTML 和网页播放器。

2.使用 Figma：

$character-motion-studio
请读取这个 Figma 链接中的角色状态。每个 Frame 是一个状态，同名图层是共享部件。
请保留原始矢量、渐变、透明镂空和装饰层，生成可编辑动画实验室和独立 HTML 播放器。
https://www.figma.com/design/...

3.使用自然语言也可以：

请使用 Character Motion Studio Skill 处理这些角色状态 SVG。
请按照附件顺序，把这些 SVG 当作同一个角色的不同状态。
识别同名图层作为共享部件，制作路径点切换动画。

要求：
1. 默认使用 ease-in-out，时长 500ms。
2. 每个状态添加呼吸和眨眼。
3. 保留分层与过渡编辑。
4. 输出可编辑 HTML。
5. 输出独立网页播放器。
6. 自己测试快速连续切换和导出功能。

## 角色部件命名
不同的角色相同的部件命名应当保持一致，这样切换的时候代码能识别，比如两个角色都有身体、手、眼睛……

某个状态独有的内容可以使用不同名称，Skill 会把它当作装饰处理，而不是强制形变。

Character
├── state-idle
│   ├── body-main
│   ├── face-main
│   ├── eye-left
│   └── eye-right
├── state-working
│   ├── body-main
│   ├── face-main
│   ├── eye-left
│   └── eye-right
└── state-happy
    ├── body-main
    ├── face-main
    ├── eye-left
    └── eye-right

## 在线体验

无需安装 Skill，点击即可体验：

[打开角色动画实验室][https://zishuouhao.github.io/character-motion-studio-skill/](https://zishuouhao.github.io/character-motion-studio-skill/)
