# Serpent Fury — Game Mechanics

## 🎮 Core Loop

You play as **Orochimaru** on a 2D side-scrolling battlefield. Each wave spawns a set of enemies that charge at you. Clear all enemies → advance to the next wave. Die → Game Over. Clear all 7 → Victory.

- **Score formula**: `kills × 100 × current wave` — so kills in later waves are worth dramatically more
- **After Wave 1 clears**: game pauses and shows the **Shinobi Gift modal** (+250 PTS bonus)
- **High score** is saved locally in `localStorage`

---

## ⚔️ Player Attacks

| Key | Jutsu | Damage | Chakra Cost | Cooldown | Behaviour |
|---|---|---|---|---|---|
| `1` / `Q` | **Snake Strike** | 15 | 10 CK | 0.5s | Fast projectile, stops on first hit |
| `2` / `E` | **Shadow Snake** | 25 | 20 CK | 1s | Longer range, stops on first hit |
| `3` / `R` | **Kusanagi** | 40 | 35 CK | 2s | **Piercing** sword — passes through all enemies |
| `4` / `Space` | **Edo Tensei** | 60 | 50 CK | 12s | **AoE explosion dome** — expands outward, hits all enemies in radius |

> **Dash** (`Shift`): invincibility frames while dashing — enemy attacks pass through you

---

## 🌊 The 7 Waves

| Wave | Enemies | Total | Difficulty |
|---|---|---|---|
| **Wave 1** | 3× Genin | 3 | 🟢 Tutorial — slow, weak |
| **Wave 2** | 2× Genin + 2× Chunin | 4 | 🟡 Introduces faster enemies |
| **Wave 3** | 3× Chunin + 1× ANBU | 4 | 🟠 ANBU hits harder |
| **Wave 4** | 1× Chunin + 3× ANBU | 4 | 🔴 ANBU majority |
| **Wave 5** | 2× ANBU + 2× Jonin | 4 | 🔴 Jonin are fast & dangerous |
| **Wave 6** | 1× ANBU + 4× Jonin | 5 | 🔴🔴 Highest enemy count |
| **Wave 7** | 1× **Shadow Kage (BOSS)** | 1 | 💀 Solo boss fight |

---

## 👹 Enemy Stats

| Enemy | HP | Speed | Damage/Hit | Attack Rate | Colour |
|---|---|---|---|---|---|
| **Genin** | 30 | 1.5 | 5 | every 2s | 🔵 Blue |
| **Chunin** | 50 | 2.0 | 10 | every 1.5s | 🟠 Orange |
| **ANBU** | 80 | 2.5 | 15 | every 1.2s | ⚪ White |
| **Jonin** | 120 | 3.0 | 20 | every 1s | 🔴 Red |
| **Shadow Kage (Boss)** | **600** | 1.8 | **30** | every 0.8s | 💀 Dark Red |

> All enemies have a **400ms warning tell** (flashes red `!`) before their hit lands — giving the player a window to dash

---

## 🩸 Survival Systems

- **HP drops**: 35% chance on any enemy kill → red diamond pickup (+20 HP), expires after 10s
- **Chakra**: depletes as you cast jutsu, regenerates passively over time
- **Camera shake**: every hit on the player triggers screen shake — scales with attack severity (Edo Tensei = max shake)
- **Floating damage numbers**: appear on every hit, float upward and fade

---

## 🏆 Win / Lose Conditions

| | Condition |
|---|---|
| **Game Over** | Player HP reaches 0 |
| **Victory** | Wave 7 boss (Shadow Kage) is killed |
| **Leaderboard** | Score submitted after either outcome with: name, email, ETH wallet, country |
