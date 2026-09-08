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

SVG 里先写的在最下面，后写的盖在上面。口诀：背景 → 背景影 → 角色落影 → 身体 → 手影 → 手 → 眼睛 → 前景影 → 前景。阴影永远紧贴在它主人前一层。

位置前缀：背景加 bg-，前景加 fg-，角色本体不加前缀
阴影后缀：-shadow（投在别处的影子）/ -shadow-cast（投到地面的落影）
成对部件加 -left / -right

举例：

<img width="774" height="465" alt="Clipboard_Screenshot_1788857838" src="https://github.com/user-attachments/assets/d7d3404f-8139-4dc3-8ce3-a2fc80e7dbf4" />


一、命名规则

<img width="773" height="290" alt="Clipboard_Screenshot_1788858608" src="https://github.com/user-attachments/assets/c0a9b9c5-d896-4e23-bcb0-66c29fe3277b" />


规则	说明	示例

状态前缀	所有状态层以 state- 开头	state-idle

部位主词	部件主词用英文	body / face / eye

方位后缀	成对部件加 -left / -right	eye-left / eye-right

细分后缀	子部件用 -main / -front / -upper 等	body-main / hair-front

连接符	一律小写连字符，不用驼峰/下划线	arm-left-upper


二、状态枚举（state-*）

英文	中文

state-idle	待机 / 空闲

state-working	工作中

state-happy	开心

state-sad	难过

state-angry	生气

state-surprised	惊讶

state-thinking	思考

state-talking	说话

state-sleeping	睡觉

state-walk	行走

state-run	奔跑

state-jump	跳跃

state-blink	眨眼

state-excited	兴奋

state-tired	疲惫


三、部件枚举

1.头部 / Head

英文	中文

head / head-main	头部主体

hair-front	前发

hair-back	后发


2.face-main	面部

eye-left / eye-right	左眼 / 右眼

eye-white / eye-pupil	眼白 / 瞳孔

brow-left / brow-right	左眉 / 右眉

nose	鼻子

mouth	嘴巴

ear-left / ear-right	左耳 / 右耳

blush	腮红


3.躯干 / Body

英文	中文

body-main	躯干主体

body-top / body-bottom	上身 / 下身

neck	脖子

chest	胸部


4.四肢 / Limbs

英文	中文

arm-left / arm-right	左臂 / 右臂

arm-left-upper / arm-left-fore	左上臂 / 左前臂

hand-left / hand-right	左手 / 右手

leg-left / leg-right	左腿 / 右腿

leg-left-thigh / leg-left-shin	左大腿 / 左小腿

foot-left / foot-right	左脚 / 右脚


5.其他 / Extras

英文	中文

tail	尾巴

wing-left / wing-right	左翼 / 右翼

horn	角

accessory-hat	帽子

accessory-glasses	眼镜

accessory-scarf	围巾

accessory-bag	背包


## 在线体验

无需安装 Skill，点击即可体验：

[打开角色动画实验室][https://zishuouhao.github.io/character-motion-studio-skill/](https://zishuouhao.github.io/character-motion-studio-skill/)
