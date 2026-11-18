# 英语星球 v2

每天一局 20 分钟、有输赢、明天不一样的单词 roguelike。原生 ES Modules，无框架、无构建，离线可玩。

## 跑起来

```bash
cd v2
python3 -m http.server 8099
# 打开 http://127.0.0.1:8099
```

手机验证：同一 Wi-Fi 下访问 `http://<你的内网 IP>:8099`，Safari/Chrome 里「添加到主屏幕」。

## 命令

| 命令 | 作用 |
|---|---|
| `npm run export` | 从 v1 的 `index.html` 抽取词库，按 level 分片导出到 `data/` |
| `npm run validate` | 语料校验：生词率、句长、目标词、选项唯一性 |
| `npm test` | 逻辑层冒烟测试：可跑完、同种子复现、失败不抹记忆 |
| `npm run serve` | 起本地静态服务（8099） |

## 结构

```
app.js            路由与流程编排
cfg.js            BUILD 号（改它即轮换 SW 缓存）
core/             rng 种子随机 / srs 间隔重复 / state 存档与迁移 / data 加载
games/            run 副本推进 / questions 出题 / drops 掉落与事件
ui/               today / dungeon / result / stats / settings / reading
data/{en,ja}/     words 分片 + texts 语料
tools/            export-words / validate-content / test-run
```

## 设计红线

1. **局内可损，局外不扣**：输了丢掉落、连胜清零，但已学词的记忆强度一分不扣。
2. **随机只作用于形式**：地图、事件、掉落随机；词表与复习节奏固定，今日新词上限可设。
3. **双语解耦**：`data/en` 与 `data/ja` 各自独立，UI 代码唯一，靠 `lang` 切换。
4. **离线优先**：一局所需资源全部进 SW 预缓存，断网可完整打完。
5. **同种子可复现**：`seed = 日期 + 语言`，同一局在任何设备上一致，便于复现 bug。

## 已知限制（M1 范围）

- 副本进度不做断点续传，中途退出即放弃本局
- 词义选择题只有「选词义 / 选单词」两种题型，听力题待 M2
- 语料目前 10 段英文 + 4 段日文，逐步补到 100 段
- 跟读评分尚未接入 v2（v1 有，迁移在 M3）

## 数据来源

词库：ECDICT（英）/ JMdict + IPADIC（日）；音标已按 CMU Pronouncing Dictionary 校对。
语料：真实媒体改写，逐段人工审，标注来源类型与难度。
