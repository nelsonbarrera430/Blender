export default class LevelManager {
    constructor(experience) {
        this.experience = experience;
        this.currentLevel = 1;
        this.totalLevels = 5;

        this.pointsToComplete = {
            1: 5,
            2: 5,
            3: 5,
            4: 5,
            5: 5
        };
    }

    nextLevel() {
        if (this.currentLevel < this.totalLevels) {
            this.currentLevel++;
            this.experience.world.clearCurrentScene();
            this.experience.world.loadLevel(this.currentLevel);
        }
    }

    resetLevel() {
        this.currentLevel = 1;
        this.experience.world.loadLevel(this.currentLevel);
    }

    getCurrentLevelTargetPoints() {
        return this.pointsToComplete?.[this.currentLevel] || 5;
    }

    getEnemiesForLevel(level) {
        const enemies = {
            1: 4,
            2: 8,
            3: 10,
            4: 17,
            5: 18
        }
        return enemies[level] || 1
    }
}
