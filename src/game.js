class Game {
    constructor(state) {
        this.state = state;
        this.spawnedObjects = [];
        this.collidableObjects = [];
        
        // GAME VALUES
        this.ground = null;
        this.gravity = -25;
        this.sensitvity = 0.001;
        this.camera = this.state.camera;
        this.bullets = [];
        this.enemies = [];
        this.enemySpawnTimer = {
            timePassed: 0,
            timeMax: 1
        };
        this.enemyCount = 0,

        // PLAYER VALUES
        this.player = {
            entityObject: null,
            lastEnemyHit: null,
            health: 100,
            maxHealth: 100,
            keyboard: {
                w: false,
                a: false,
                s: false,
                d: false
            },
            velocity: {
                x: 0,
                y: 0,
                z: 0
            },
            speed: 3.0,
            mouse: {
                x: 0,
                y: 0
            },
            rotation: {
                aboutY: 0,
                aboutX: 0
            },
            jumped: 0,
            jumpsRemain: 2,
            maxJumps: 2,
            grounded: false,
            heightFromMiddle: 0,
            bulletSpeed: 100,
            bulletDamage: 10,
            bulletFireRate: 0.1,
            bulletLastFired: 0,
            firing: false,
            score: 0,
        };


        // ENEMY VALUES
        this.enemyValues = {
            health: 50,
            speed: 5
        };


        // MISC VALUES
        this.status = {};
        this.frameCounter = {};
        this.initialSetup = 0;
        this.screenLocked = 0;
        this.gameKeys = {
            player: "mainPlayer",
            enemy: "enemy",
            wall: "wall",
            ground: "mainPlane",
            bullet: "bullet"
        };
    }


    keyPressSetup() {
        document.addEventListener("keydown", (e) => {
            e.preventDefault();

            let playerVelocity = this.player.velocity;

            switch (e.key) {
                case "w":
                    this.player.keyboard.w = true;
                    break;

                case "a":
                    this.player.keyboard.a = true;
                    break;

                case "s":
                    this.player.keyboard.s = true;
                    break;

                case "d":
                    this.player.keyboard.d = true;
                    break;

                case " ":
                    // Slight offset to make player offground
                    if (this.player.jumped != 1 && this.player.jumpsRemain > 0) {
                        this.player.grounded = false;
                        this.player.jumpsRemain--;
                        this.player.entityObject.model.position[1] += 0.1;
                        playerVelocity.y = 8;
                        this.player.jumped = 1;
                    }
                    break;

                default:
                    break;
            }
        });
        
        document.addEventListener("keyup", (e) => {
            e.preventDefault();

            switch (e.key) {
                case "w":
                    this.player.keyboard.w = false;
                    this.player.velocity.z = 0;
                    break;

                case "a":
                    this.player.keyboard.a = false;
                    this.player.velocity.x = 0;
                    break;

                case "s":
                    this.player.keyboard.s = false;
                    this.player.velocity.z = 0;
                    break;

                case "d":
                    this.player.keyboard.d = false;
                    this.player.velocity.x = 0;
                    break;

                case " ":
                    this.player.jumped = this.player.jumped == 1 ? 0 : 1;
                    break;

                default:
                    break;
            }
        });

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);

        // Setup pointer lock on screen click,
        // Source: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
        let myGLCanvas = document.querySelector("#glCanvas");
        myGLCanvas.addEventListener("click", async () => {
            await myGLCanvas.requestPointerLock({
                unadjustedMovement: true
            });
        });

        myGLCanvas.addEventListener("mousemove", (event) => {
            if (document.pointerLockElement === myGLCanvas) {
                this.player.mouse.x += event.movementX;
                this.player.mouse.y += event.movementY;
            }
        });

        myGLCanvas.addEventListener("mousedown", () => {
            if (document.pointerLockElement === myGLCanvas) {
                this.player.firing = true;
            }
        });

        myGLCanvas.addEventListener("mouseup", () => {
            if (document.pointerLockElement === myGLCanvas) {
                this.player.firing = false;
            }
        });
    }


    spawnBullet(parent) {
        let middleOfParent = parent.entityObject.model.position;
        let rotOfParent = parent.entityObject.model.rotation;

        let xMovement = (
            (parent.bulletSpeed) * Math.sin(parent.rotation.aboutY) *
            Math.cos(parent.rotation.aboutX));

        let yMovement = (
            (parent.bulletSpeed) * Math.sin(-parent.rotation.aboutX));

        let zMovement = (
            (parent.bulletSpeed) * Math.cos(parent.rotation.aboutY) *
            Math.cos(parent.rotation.aboutX));
        

        spawnObject({
            name: `bullet${this.bullets.length}`,
            type: "cube",
            material: {
                diffuse: vec3.fromValues(1, 1, 0)
            },
            position: vec3.fromValues(
                middleOfParent[0], 
                middleOfParent[1], 
                middleOfParent[2]
            ),
            rotation: mat4.copy(mat4.create(), rotOfParent),
            scale: vec3.fromValues(0.1, 0.1, 0.25),

        }, this.state).then((result) => {
            result.velocity = vec3.fromValues(
                xMovement,
                yMovement,
                zMovement
            );
            result.parentObject = parent.entityObject;
            this.createBoxCollider(result);
            this.bullets.push(result);
        });
    }


    spawnEnemy() {
        let minSpawnDistanceZ = this.player.entityObject.model.position[2] + 50;
        let minSpawnDistanceX = this.player.entityObject.model.position[0] + 50;
        
        let spawnX = Math.floor(Math.random() * (100 - (-100) + 1) + (-100));
        let spawnY = 5;
        let spawnZ = 0;

        let negZ = Math.floor(Math.random() * (2 - (1) + 1) + (1));

        if (spawnX > minSpawnDistanceX || spawnX < -minSpawnDistanceX) {
            spawnZ = Math.floor(Math.random() * (100 - (-100) + 1) + (-100));
        } else {
            spawnZ = Math.floor(Math.random() * (100 - (minSpawnDistanceZ) + 1) + (minSpawnDistanceZ));
        }

        if (negZ == 1) spawnZ *= -1;

        // Spawn enemy at location
        spawnObject({
            name: `enemy${this.enemyCount}`,
            type: "cube",
            material: {
                diffuse: vec3.fromValues(1, 0, 1),
                ambient: [0.3, 0, 0.3],
                specular: [0.1, 0.1, 0.1],
                n: 10,
                shaderType: 3,
                alpha: 1,
            },
            diffuseTexture: "pepe.jpg",
            normalTexture: "defaultNorm.jpg",
            position: vec3.fromValues(spawnX, spawnY, spawnZ),
            scale: vec3.fromValues(1, 1, 1),

        }, this.state).then((result) => {
            result.velocity = vec3.fromValues(
                0,
                10,
                0
            );
            result.grounded = false;
            result.health = this.enemyValues.health;
            this.createBoxCollider(result);
            this.enemies = [...this.enemies, result];
            this.enemyCount++;
        });
        
    }


    createBoxCollider(object) {
        object.collider = {
            type: "CUBE",
        };
        this.collidableObjects = [...this.collidableObjects, object];
    }

    
    // See if we can optimize this later
    getVertexCoords(object) {
        let vertices = [];

        for (let i = 0; i < object.model.vertices.length; i += 3) {
            let vertex = vec3.fromValues(
                object.model.vertices[i],
                object.model.vertices[i + 1],
                object.model.vertices[i + 2]
            );
            let transformedVertex = vec3.create();
            vec3.transformMat4(transformedVertex, vertex, object.model.modelMatrix);
            vertices.push(transformedVertex);
        }

        let objectBounds = {
            minX: vertices[0][0],
            maxX: vertices[0][0],
            minY: vertices[0][1],
            maxY: vertices[0][1],
            minZ: vertices[0][2],
            maxZ: vertices[0][2],
        };

        vertices.forEach((vertex) => {
            objectBounds.minX = vertex[0] <= objectBounds.minX ? vertex[0] : objectBounds.minX;
            objectBounds.maxX = vertex[0] > objectBounds.maxX ? vertex[0] : objectBounds.maxX;

            objectBounds.minY = vertex[1] <= objectBounds.minY ? vertex[1] : objectBounds.minY;
            objectBounds.maxY = vertex[1] > objectBounds.maxY ? vertex[1] : objectBounds.maxY;

            objectBounds.minZ = vertex[2] <= objectBounds.minZ ? vertex[2] : objectBounds.minZ;
            objectBounds.maxZ = vertex[2] > objectBounds.maxZ ? vertex[2] : objectBounds.maxZ;
        });


        return objectBounds;
    }

    
    // From https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection
    handleCollisions() {
        let entity = this.collidableObjects;
        let otherEntity = this.collidableObjects;

        // GO THROUGH ALL ENTITIES
        // CHECK IF EACH ENTITY HITS ALL COLLIDABLE OBJECTS

        for (let i = entity.length-1; i >= 0; i--) {
            let entityBoundsCheck = this.getVertexCoords(entity[i]);

            // Remove bullet when position y < -5
            if (entity[i].name.slice(0, 6) == this.gameKeys.bullet &&
            entity[i].model.position[1] < -5) {
                this.despawnBullet(entity[i], i);
                continue;
            }

            for (let j = otherEntity.length-1; j >= 0; j--) {
                let otherEntityBoundsCheck = this.getVertexCoords(otherEntity[j]);  

                // COLLISION CHECKS
                if (this.collided(entityBoundsCheck, otherEntityBoundsCheck)) {
                    // HANDLE PLAYER COLLISIONS
                    // - handle when player collided with wall (damages player but blocks bullets)
                    // - handle when player collided with enemy bullet
                    // - handle when player collided with certain enemy type
                    if (entity[i].name == this.gameKeys.player) {
                        // Player ground hit
                        if (otherEntity[j].name == this.gameKeys.ground) {
                            this.player.grounded = true;
                            this.player.entityObject.model.position[1] = (
                                this.ground.model.position[1] + 
                                this.player.heightFromMiddle
                            );
                            this.player.jumpsRemain = this.player.maxJumps;
                        }

                        // Player wall hit
                        else if (otherEntity[j].name.slice(0, 4) == this.gameKeys.wall) {
                            // damage player
                            this.player.health -=  0.125;
                            this.player.health = this.player.health < 0 ? 0 : this.player.health;

                        }
                        
                        // Player bullet hit
                        else if (otherEntity[j].name.slice(0, 6) == this.gameKeys.bullet &&
                        otherEntity[j].parentObject != entity[i]) {
                        }

                        // Player hit by enemy
                        else if (otherEntity[j].name.slice(0, 5) == this.gameKeys.enemy) {
                            this.player.health -= 40;
                            if (this.player.health < 0) this.player.health = 0;
                            if (this.player.lastEnemyHit == otherEntity[j]) this.player.lastEnemyHit = null;
                            this.despawnEnemy(otherEntity[j], j);
                            continue;
                        }

                    }
                   
                    // HANDLE ENEMY COLLISIONS
                    // - handle when enemy collided with wall
                    // - handle when certain enemy type collided with player
                    // - handle when enemy collided with player bullet
                    else if (entity[i].name.slice(0,5) == this.gameKeys.enemy) {
                        
                        if (otherEntity[j].name == this.gameKeys.ground) {
                            entity[i].grounded = true;
                            entity[i].model.position[1] = (
                                this.ground.model.position[1] + 
                                entityBoundsCheck.maxY - entity[i].model.position[1]
                            );
                        }

                        else if (otherEntity[j].name.slice(0, 4) == this.gameKeys.wall) {

                            this.despawnEnemy(entity[i], i);
                            break;
                        }

                        else if (otherEntity[j].name.slice(0, 6) == this.gameKeys.bullet &&
                        otherEntity[j].parentObject != entity[i]) {
                            this.player.lastEnemyHit = entity[i];
                            entity[i].health -= this.player.bulletDamage;
                            this.despawnBullet(otherEntity[j], j);
                            if (entity[i].health <= 0) {
                                this.despawnEnemy(entity[i], i);
                                this.player.lastEnemyHit = null;
                                this.player.score++;
                                break;
                            }
                        }
                        
                    } else if (entity[i].name.slice(0,4) == this.gameKeys.wall) {
                        // HANDLE WALL HITS
                        if (otherEntity[j].name.slice(0, 6) == this.gameKeys.bullet) {
                            this.despawnBullet(otherEntity[j], j);
                        }
                    }
                }
            }
        }
    }


    despawnBullet(bulletObject, index) {
        this.bullets.forEach((bullet, index, object) => {
            if (bullet == bulletObject) {
                object.splice(index, 1);
            }
        });

        this.state.objects.forEach((item, index, object) => {
            if (item == bulletObject) {
                object.splice(index, 1);
            }
        });
        this.collidableObjects.splice(index, 1);
    }

    
    despawnEnemy(enemyObject, index) {
        this.enemies.forEach((enemy, index, object) => {
            if (enemy == enemyObject) {
                object.splice(index, 1);
            }
        });

        this.state.objects.forEach((enemy, index, object) => {
            if (enemy == enemyObject) {
                object.splice(index, 1);
            }
        })
        this.collidableObjects.splice(index, 1);
        this.enemyCount--;
    }


    collided(objectBounds, otherObjectBounds) {
        return (
            objectBounds.minX <= otherObjectBounds.maxX &&
            objectBounds.maxX >= otherObjectBounds.minX &&
            objectBounds.minY <= otherObjectBounds.maxY &&
            objectBounds.maxY >= otherObjectBounds.minY &&
            objectBounds.minZ <= otherObjectBounds.maxZ &&
            objectBounds.maxZ >= otherObjectBounds.minZ
        );
    }


    updatePlayer(deltaTime) {
        this.updatePlayerCamera(deltaTime);
        this.updatePlayerMovement(deltaTime);
        if (this.player.firing && this.player.bulletLastFired >= this.player.bulletFireRate) {
            this.spawnBullet(this.player);
            this.player.bulletLastFired = 0;
        }
    }


    updatePlayerCamera(deltaTime) {
        let mouseMovement = this.player.mouse;
        let entityObjectRotation = this.player.entityObject.model.rotation;

        // Rotate by this much
        let rotationAboutX = (mouseMovement.y * this.sensitvity);
        let rotationAboutY = -(mouseMovement.x * this.sensitvity);

        // Record rotations
        this.player.rotation.aboutY += rotationAboutY;
        if (this.player.rotation.aboutX >= -Math.PI/2 && this.player.rotation.aboutX <= Math.PI/2) {
            this.player.rotation.aboutX += rotationAboutX;

            if (this.player.rotation.aboutX <= -Math.PI/2) {
                this.player.rotation.aboutX = -Math.PI/2 + 0.001;
            } else if (this.player.rotation.aboutX >= Math.PI/2) {
                this.player.rotation.aboutX = Math.PI/2 - 0.001;
            }
        }

        // Player rotation
        mat4.rotateY(
            entityObjectRotation,
            entityObjectRotation,
            rotationAboutY
        );
        
        this.camera.position = [
            this.player.entityObject.model.position[0] + this.player.entityObject.centroid[0],
            this.player.entityObject.model.position[1] + this.player.entityObject.centroid[1],
            this.player.entityObject.model.position[2] + this.player.entityObject.centroid[2] 
        ];
        
        this.camera.front = [
            Math.sin(this.player.rotation.aboutY) * Math.cos(this.player.rotation.aboutX),
            Math.sin(-this.player.rotation.aboutX),
            Math.cos(this.player.rotation.aboutY) * Math.cos(this.player.rotation.aboutX)
        ];

        this.state.pointLights[0].position = [
            this.player.entityObject.model.position[0] + this.player.entityObject.centroid[0],
            this.player.entityObject.model.position[1] + this.player.entityObject.centroid[1],
            this.player.entityObject.model.position[2] + this.player.entityObject.centroid[2] 
        ]

        mouseMovement.x = 0;
        mouseMovement.y = 0;
    }


    updatePlayerMovement(deltaTime) {
        let playerVelocity = this.player.velocity;
        if (!this.player.grounded) {
            playerVelocity.y += this.gravity * deltaTime;
        } else {
            playerVelocity.y = 0;
        }

        if (this.player.keyboard.w && !this.player.keyboard.s) {
            playerVelocity.z = this.player.speed;
        } else if (this.player.keyboard.s && !this.player.keyboard.w) {
            playerVelocity.z = -this.player.speed;
        } else {
            playerVelocity.z = 0;
        }

        if (this.player.keyboard.a && !this.player.keyboard.d) {
            playerVelocity.x = this.player.speed;
        } else if (this.player.keyboard.d && !this.player.keyboard.a) {
            playerVelocity.x = -this.player.speed;
        } else {
            playerVelocity.x = 0;
        }

        let xMovement = (
            (playerVelocity.z) * Math.sin(this.player.rotation.aboutY) +
            (playerVelocity.x) * Math.cos(-this.player.rotation.aboutY));

        let zMovement = (
            (playerVelocity.z) * Math.cos(this.player.rotation.aboutY) +
            (playerVelocity.x) * Math.sin(-this.player.rotation.aboutY));
        
        this.player.entityObject.translate(vec3.fromValues(
            xMovement*deltaTime, 
            playerVelocity.y*deltaTime, 
            zMovement*deltaTime
        ));
    }


    updateBullets(deltaTime) {
        for (let bullet of this.bullets) {
            bullet.velocity[1] += (this.gravity * deltaTime)/5;
            bullet.translate(vec3.fromValues(
                bullet.velocity[0]*deltaTime,
                bullet.velocity[1]*deltaTime,
                bullet.velocity[2]*deltaTime
            ));
        }
    }


    updateEnemies(deltaTime) {
        for (let enemy of this.enemies) {
            if (!enemy.grounded) {
                enemy.velocity[1] += this.gravity * deltaTime;
            } else {
                enemy.velocity[1] = 0;
            }

            let playerPos = this.player.entityObject.model.position;
            let enemyPos = enemy.model.position;

            let xDiff = 0;
            let zDiff = 0;

            if (enemyPos[2] > playerPos[2]) zDiff = enemyPos[2] - playerPos[2];
            else zDiff = playerPos[2] - enemyPos[2];

            if (enemyPos[0] > playerPos[0]) xDiff = enemyPos[0] - playerPos[0];
            else xDiff = playerPos[0] - enemyPos[0];

            let angle = Math.atan(xDiff / zDiff);

            if (enemyPos[0] > playerPos[0] && enemyPos[2] > playerPos[2]) {
                mat4.rotateY(enemy.model.rotation, mat4.create(), angle);
                enemy.velocity[0] = -Math.sin(angle) * this.enemyValues.speed;
                enemy.velocity[2] = -Math.cos(angle) * this.enemyValues.speed;
            }

            else if (enemyPos[0] < playerPos[0] && enemyPos[2] > playerPos[2]) {
                mat4.rotateY(enemy.model.rotation, mat4.create(), -angle);
                enemy.velocity[0] = Math.sin(angle) * this.enemyValues.speed;
                enemy.velocity[2] = -Math.cos(angle) * this.enemyValues.speed;
            }

            else if (enemyPos[0] > playerPos[0] && enemyPos[2] < playerPos[2]) { 
                mat4.rotateY(enemy.model.rotation, mat4.create(), -angle);
                enemy.velocity[2] = Math.cos(angle) * this.enemyValues.speed;
                enemy.velocity[0] = -Math.sin(angle) * this.enemyValues.speed;
            }

            else if (enemyPos[0] < playerPos[0] && enemyPos[2] < playerPos[2]) {
                mat4.rotateY(enemy.model.rotation, mat4.create(), angle);
                enemy.velocity[2] = Math.cos(angle) * this.enemyValues.speed;
                enemy.velocity[0] = Math.sin(angle) * this.enemyValues.speed;
            }

            enemy.translate(vec3.fromValues(
                enemy.velocity[0]*deltaTime, 
                enemy.velocity[1]*deltaTime, 
                enemy.velocity[2]*deltaTime
            ));
        }
    }


    // Crosshair: https://stackoverflow.com/questions/44541915/javascript-canvas-crosshair-at-center
    updateStatusCanvas() {
        let ctx = this.status.ctx;

        // Clear top left
        ctx.clearRect(0, 0, this.status.canvas.width/5, this.status.canvas.height/6);
        // Clear bottom left
        ctx.clearRect(0, this.status.canvas.height/3,
            this.status.canvas.width/5, this.status.canvas.height/2);
        
        // Clear bottom right
        ctx.clearRect(this.status.canvas.width/2 - this.status.canvas.width/12, 
        this.status.canvas.height/2 - this.status.canvas.height/16,
        this.status.canvas.width/2, this.status.canvas.height/2);

        // Clear top
        ctx.clearRect(
            this.status.canvas.width/4 - this.status.canvas.width/8, 0,
            this.status.canvas.width/4, this.status.canvas.width/16
        )
        
        // Text stuff
        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.fillText((`Position (X, Y, Z): ` + 
        `${this.player.entityObject.model.position[0].toFixed(0)}, ` +
        `${this.player.entityObject.model.position[1].toFixed(0)}, ` +
        `${this.player.entityObject.model.position[2].toFixed(0)}`), 10, 30);
        ctx.fillText(`FPS: ${this.frameCounter.fps}`, 10, 50);
        if (document.pointerLockElement === document.querySelector("#glCanvas")) {
            ctx.fillText(`Mouse is LOCKED`, 10, 70);
        } else {
            ctx.fillText(`Mouse is UNLOCKED`, 10, 70);
        }

        ctx.fillText((
            `collidableObjects: ${this.collidableObjects.length}`
        ), 10, 90);
        ctx.fillText((
            `state.objects: ${this.state.objects.length}`
        ), 10, 110);
        ctx.fillText((
            `bullets: ${this.bullets.length}`
        ), 10, 130);
        ctx.fillText((
            `enemies: ${this.enemies.length}`
        ), 10, 150);

        // Last enemy shot health
        if (this.player.lastEnemyHit != null) {
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            ctx.fillText(
                `${this.player.lastEnemyHit.name}'s health`,
                this.state.canvas.width/2,
                50
            );
            ctx.fillStyle = "#FF0000";
            ctx.fillRect(
                this.state.canvas.width/2 - this.state.canvas.width/14,
                this.state.canvas.height/14, 
                this.state.canvas.width/7,
                this.state.canvas.height/32);
            ctx.fillStyle = "#00FF00";
            ctx.fillRect(
                this.state.canvas.width/2 - this.state.canvas.width/14,
                this.state.canvas.height/14,
                (
                    this.player.lastEnemyHit.health * 
                    (this.state.canvas.width/7 / this.enemyValues.health)
                ),
                this.state.canvas.height/32);
        }
        
        ctx.textAlign = "start";

        // Player score
        ctx.font = "36px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`Score: ${this.player.score}`, 
        this.status.canvas.width/2 - this.status.canvas.width/16, 
        this.status.canvas.height/2 - 30);

        // Player health
        ctx.font = "36px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`Health: `, 30, this.status.canvas.height/2 - 30);

        // Player shape stuff
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(160, this.status.canvas.height/2 - 60, 
        300, 36)
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(160, this.status.canvas.height/2 - 60,
        (this.player.health * (300 / this.player.maxHealth)), 36);

    }

    randomInt(min, max) {
        let result = Math.floor(Math.random() * (max - (min) + 1) + (min));
        while (Math.abs(result) < 3) {
            result = Math.floor(Math.random() * (max - (min) + 1) + (min))
        }
        return result;
    }

    createRandomWalls() {
        // random rotations
        // random scale
        
        // first between 

        for (let i = 1; i <= 16; i++) {
            spawnObject(getObject(this.state, "wall"), this.state).then((result) => {
                result.name = `wall${i+1}`;
                result.model.position = [
                    this.randomInt(-30, 30), 
                    0,
                    this.randomInt(-30, 30)
                ];
                result.model.scale = [
                    this.randomInt(1, 20),
                    this.randomInt(1, 10),
                    1
                ];
                result.model.rotation = mat4.create();
                mat4.rotateY(
                    result.model.rotation, 
                    result.model.rotation, 
                    Math.floor(Math.random() * (3 - (-3) + 1) + (-3)));
                this.createBoxCollider(result);
            });
        }

    }


    // runs once on startup after the scene loads the objects
    async onStart() {
        console.log("On start");
        
        // Setup text writing and drawing
        let statusCanvas = document.querySelector("#statusCanvas");
        statusCanvas.width = statusCanvas.clientWidth * 2;
        statusCanvas.height = statusCanvas.clientHeight * 2;
        let ctx = statusCanvas.getContext("2d");
        ctx.scale(2, 2);

        ctx.strokeStyle = '#00FF00';
        let x = statusCanvas.width/4;
        let y = statusCanvas.height/4;
        ctx.lineWidth = 3;
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y - 3);
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x, y + 3);

        ctx.moveTo(x - 10,  y);
        ctx.lineTo(x - 3,  y);
        ctx.moveTo(x + 10,  y);
        ctx.lineTo(x + 3,  y);

        ctx.stroke();
        ctx.save();

        // ================ START HERE ================ 

        // TESTING - set up player
        let entityObject = getObject(this.state, "mainPlayer");
        this.createBoxCollider(entityObject);
        this.player.entityObject = entityObject;

        // TESTING - set up collider for plane
        let mainPlane = getObject(this.state, "mainPlane");
        this.createBoxCollider(mainPlane);
        this.ground = mainPlane;
        
        // TESTING - set up collider for wall
        this.createBoxCollider(getObject(this.state, "wall"));

        // TESTING - status container
        this.status.canvas = document.querySelector("#statusCanvas");
        this.status.ctx = this.status.canvas.getContext("2d");
        this.frameCounter.timePassed = 0;
        this.frameCounter.frames = 0;
        this.frameCounter.fps = 0;

        // TESTING - setup key presses
        this.keyPressSetup();

        this.createRandomWalls();
    }


    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        if (this.player.health == 0) {
            let ctx = this.status.canvas.getContext("2d");
            ctx.font = "32px Arial";
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.fillText(
                `Game over. Refresh to restart.`, 
                this.status.canvas.width/4,
                this.status.canvas.height/8,
            );
            ctx.textAlign = "start";
            return;
        }

        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions
        this.frameCounter.timePassed += deltaTime;
        this.frameCounter.frames += 1;
        this.enemySpawnTimer.timePassed += deltaTime;
        this.player.bulletLastFired += deltaTime;

        // SOME SETUPS DONE HERE AS ONSTART DOESNT WORK
        if (this.initialSetup == 0) {
            // Text stuff
            let ctx = this.status.canvas.getContext("2d");
            ctx.font = "16px Arial";
            ctx.fillStyle = "yellow";
            ctx.fillText(`SETTING UP...`, 10, 90);
            if (this.frameCounter.timePassed < 3) return;
            this.player.heightFromMiddle = this.player.entityObject.centroid[1]*2;
            this.initialSetup++;
        }

        // SPAWN ENEMIES AFTER A CERTAIN TIME
        if (this.enemySpawnTimer.timePassed >= this.enemySpawnTimer.timeMax) {
            this.spawnEnemy();
            this.enemySpawnTimer.timePassed = 0;
        }

        // UPDATE ALL MOVEMENTS
        this.updateBullets(deltaTime);
        this.updateEnemies(deltaTime);
        this.updatePlayer(deltaTime);
        

        // HANDLE COLLISIONS
        this.handleCollisions();

        // Frame counter for fun
        if (this.frameCounter.timePassed >= 1) {
            this.frameCounter.fps = this.frameCounter.frames;
            this.frameCounter.frames = 0;
            this.frameCounter.timePassed = 0;
        }

        // UPDATE STATUS CANVAS
        this.updateStatusCanvas();
    }
}
