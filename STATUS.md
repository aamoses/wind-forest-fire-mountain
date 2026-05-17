# 风林火山·四方乱斗 — 项目状态

status: READY_FOR_REVIEW
milestone: "核心战斗逻辑 — 9项规则修正 + AI陷阱上限 + 布阵文本更新"
changed_files:
  - js/ai.js         (AI布阵阶段陷阱上限检查 + 非布阵阶段陷阱上限 + 山技能maxSteps=4)
  - js/state.js      (calcDamage克制取整 + deployTurns=4 + getCurrentFactionInfo文本)
  - js/actions.js    (近战攻击仅击杀时位移 + 风技能排除施放者)
  - js/skills.js     (风技能排除施放者 + 火技能友方阻挡 + 陷阱上限3 + 山技能4步)
  - index.html       (布阵阶段文本：前两轮 → 第1轮)
  - css/style.css    (3D麻将风 + 暖调背景 + 入场动画)
  - js/config.js     (SVG兵人重设计)
  - js/board.js      (粒子升级 + 四方向信息栏 + 文本去重)
  - js/app.js        (入场动画 + 胜利记录 + 模拟测试)
  - DESIGN.md        (16章最终设计文档)
