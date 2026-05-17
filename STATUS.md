# 风林火山·四方乱斗 — 项目状态

status: READY_FOR_REVIEW
milestone: "全面重构 — 好看好玩版：平面俯视棋盘 + 圆形棋子 + 移动后可继续攻击 + AI联动 + 所有REVIEW问题修复"
changed_files:
  - index.html       (CSS Grid布局，去3D旋转，新入场动画)
  - css/style.css    (全面重写：平面风格，圆形棋子，方向指示器)
  - js/config.js     (阵营emoji图标，COUNTER倍率1.5x/0.67x)
  - js/state.js      (calcDamage ceil/floor取整，turnActions追踪，deployTurns:4)
  - js/actions.js    (moveAction不结束回合，可继续攻击/技能，手动结束回合)
  - js/board.js      (圆形棋子渲染，去3D，边栏方向指示，动画优化)
  - js/skills.js     (风刃排除自伤，火不伤友军，技能消息更新)
  - js/ai.js         (move_then_melee复合动作，mountain_attack_only，AI延迟优化)
  - js/app.js        (入场动画，重启逻辑，胜利记录)
