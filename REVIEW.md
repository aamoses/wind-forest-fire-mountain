# REVIEW — 风林火山代码审查 (2026-05-17)

> 状态：DONE
> 审查范围：GitHub main分支全量代码

---

## ✅ 所有修复已完成

### R1. 近战攻击位移Bug — DONE
只有击杀时才位移，目标存活时攻击者留原位。

### R2. AI近战位移Bug — DONE
同R1，加了击杀判断。

### R3. 克制取整修正 — DONE
克制方 ceil，被克方 floor，无克制原值。

### R4. 风刃不自伤 — DONE
`getWindTargets` 排除施放者自己（`excludePieceId` 参数）。

### R5. 火不伤友军 — DONE
`executeFireSkill` 碰到友军停止，不造成伤害。

### R6. 陷阱上限3 — DONE
`enterTrapPlaceMode` 和 `placeTrap` 都有上限检查。

### R7. 布阵期4回合 — DONE
`deployTurns: 4`。

### R8. 山4步 — DONE
山阵营初始弹药4，AI评分调整。

### R9. AI布阵期检查 — DONE
`generateAllActions` 有 `inDeploy` 检查，布阵期不生成攻击/技能动作。
