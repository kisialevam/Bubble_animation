(function attachBubbleAnimation(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    assets: Object.freeze({
      bubble: 'bubble',
      x1: 'x1',
      wow: 'wow'
    }),
    positions: Object.freeze({
      x1: Object.freeze({ x: 8, y: -20 }),
      wow: Object.freeze({ x: 5, y: -19 })
    }),
    settings: Object.freeze({
      anticipation: 36,
      jumpHeight: 43,
      landingBounce: 24,
      speed: 2,
      switchMoment: 90,
      bubbleReaction: 1.7
    })
  });

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  class BubbleAnimationController {
    constructor(scene, options) {
      if (!scene || !scene.add || !scene.tweens || !scene.time) {
        throw new Error('BubbleAnimationController requires an active Phaser.Scene.');
      }

      const config = options || {};
      const gameSize = scene.scale.gameSize;

      this.scene = scene;
      this.x = config.x ?? gameSize.width / 2;
      this.y = config.y ?? gameSize.height / 2;
      this.assets = {
        ...DEFAULTS.assets,
        ...(config.assets || {})
      };
      this.positions = {
        x1: {
          ...DEFAULTS.positions.x1,
          ...(config.positions?.x1 || {})
        },
        wow: {
          ...DEFAULTS.positions.wow,
          ...(config.positions?.wow || {})
        }
      };
      this.settings = {
        ...DEFAULTS.settings,
        ...(config.settings || {})
      };
      this.activeTexture = config.initialTexture === 'wow' ? 'wow' : 'x1';
      this.onSwitch = typeof config.onSwitch === 'function' ? config.onSwitch : null;
      this.onComplete = typeof config.onComplete === 'function' ? config.onComplete : null;
      this._playing = false;
      this._destroyed = false;
      this._switchEvent = null;

      const depth = config.depth ?? 0;
      this.bubble = scene.add.image(this.x, this.y, this.assets.bubble)
        .setDepth(depth);
      this.content = scene.add.image(this.x, this.y, this.assets[this.activeTexture])
        .setDepth(depth + 1);

      this._applyRestingPosition();
    }

    get isPlaying() {
      return this._playing;
    }

    get nextTexture() {
      return this.activeTexture === 'x1' ? 'wow' : 'x1';
    }

    setPosition(x, y) {
      this.x = x;
      this.y = y;

      if (!this._playing) {
        this._applyRestingPosition();
      }

      return this;
    }

    reset(texture) {
      if (this._playing || this._destroyed) {
        return false;
      }

      this.activeTexture = texture === 'wow' ? 'wow' : 'x1';
      this.content.setTexture(this.assets[this.activeTexture]);
      this._applyRestingPosition();
      return true;
    }

    play() {
      if (this._playing || this._destroyed) {
        return false;
      }

      this._playing = true;

      const nextTexture = this.nextTexture;
      const currentPosition = this.positions[this.activeTexture];
      const nextPosition = this.positions[nextTexture];
      const currentBaseY = this.y + currentPosition.y;
      const nextBaseX = this.x + nextPosition.x;
      const nextBaseY = this.y + nextPosition.y;
      const anticipation = Math.max(0, this.settings.anticipation);
      const jumpHeight = Math.max(0, this.settings.jumpHeight);
      const landingBounce = Math.max(0, this.settings.landingBounce);
      const speed = Math.max(0.05, this.settings.speed);
      const switchMoment = clamp(this.settings.switchMoment, -100, 100);
      const bubbleReaction = Math.max(0, this.settings.bubbleReaction);
      const hasAnticipation = anticipation > 0;
      const duration = (milliseconds) => Math.max(1, Math.round(milliseconds / speed));
      const anticipationDuration = duration(135);
      const ascentDuration = duration(300);
      const fallDuration = duration(300);
      const bubbleDip = Math.min(8, anticipation * 0.14) * bubbleReaction;
      const bubbleLift = Math.min(12, jumpHeight * 0.2) * bubbleReaction;
      const bubbleBounce = Math.min(6, landingBounce * 0.15) * bubbleReaction;
      const switchDelay = switchMoment <= 0
        ? anticipationDuration + ascentDuration * (1 + switchMoment / 100)
        : anticipationDuration + ascentDuration + fallDuration * (switchMoment / 100);
      let hasSwitched = false;

      const switchTexture = () => {
        if (hasSwitched || this._destroyed) {
          return;
        }

        hasSwitched = true;
        this.content.setTexture(this.assets[nextTexture]);
        this.activeTexture = nextTexture;
        this.onSwitch?.(this.activeTexture, this);
      };

      const finishAnimation = () => {
        if (this._destroyed) {
          return;
        }

        switchTexture();
        this._switchEvent?.remove(false);
        this._switchEvent = null;
        this._playing = false;
        this._applyRestingPosition();
        this.onComplete?.(this.activeTexture, this);
      };

      const playLandingBounce = () => {
        if (landingBounce === 0) {
          finishAnimation();
          return;
        }

        this.scene.tweens.add({
          targets: this.bubble,
          y: this.y - bubbleBounce,
          scaleX: 1 - 0.015 * bubbleReaction,
          scaleY: 1 + 0.02 * bubbleReaction,
          duration: duration(135),
          ease: 'Quad.Out'
        });

        this.scene.tweens.add({
          targets: this.content,
          y: nextBaseY - landingBounce * 0.55,
          scaleX: 0.98,
          scaleY: 1.03,
          duration: duration(135),
          ease: 'Quad.Out',
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.bubble,
              y: this.y,
              scaleX: 1,
              scaleY: 1,
              duration: duration(165),
              ease: 'Sine.InOut'
            });

            this.scene.tweens.add({
              targets: this.content,
              y: nextBaseY,
              scaleX: 1,
              scaleY: 1,
              duration: duration(165),
              ease: 'Sine.InOut',
              onComplete: finishAnimation
            });
          }
        });
      };

      this._switchEvent = this.scene.time.delayedCall(switchDelay, switchTexture);

      this.scene.tweens.add({
        targets: this.bubble,
        y: this.y + bubbleDip,
        scaleX: hasAnticipation ? 1 + 0.035 * bubbleReaction : 1,
        scaleY: hasAnticipation ? 1 - 0.035 * bubbleReaction : 1,
        duration: anticipationDuration,
        ease: 'Quad.In'
      });

      this.scene.tweens.add({
        targets: this.content,
        y: currentBaseY + anticipation,
        scaleX: hasAnticipation ? 1.08 : 1,
        scaleY: hasAnticipation ? 0.9 : 1,
        duration: anticipationDuration,
        ease: 'Quad.In',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.bubble,
            y: this.y - bubbleLift,
            scaleX: 1 - 0.015 * bubbleReaction,
            scaleY: 1 + 0.025 * bubbleReaction,
            duration: ascentDuration,
            ease: 'Quad.Out'
          });

          this.scene.tweens.add({
            targets: this.content,
            y: currentBaseY - jumpHeight,
            scaleX: 0.98,
            scaleY: 1.07,
            duration: ascentDuration,
            ease: 'Quad.Out',
            onComplete: () => {
              this.content.setPosition(nextBaseX, nextBaseY - jumpHeight);

              this.scene.tweens.add({
                targets: this.bubble,
                y: this.y + bubbleBounce,
                scaleX: landingBounce > 0 ? 1 + 0.04 * bubbleReaction : 1,
                scaleY: landingBounce > 0 ? 1 - 0.04 * bubbleReaction : 1,
                duration: fallDuration,
                ease: 'Quad.In'
              });

              this.scene.tweens.add({
                targets: this.content,
                x: nextBaseX,
                y: nextBaseY + landingBounce,
                scaleX: landingBounce > 0 ? 1.07 : 1,
                scaleY: landingBounce > 0 ? 0.91 : 1,
                duration: fallDuration,
                ease: 'Quad.In',
                onComplete: playLandingBounce
              });
            }
          });
        }
      });

      return true;
    }

    destroy() {
      if (this._destroyed) {
        return;
      }

      this._destroyed = true;
      this._switchEvent?.remove(false);
      this.scene.tweens.killTweensOf(this.bubble);
      this.scene.tweens.killTweensOf(this.content);
      this.bubble.destroy();
      this.content.destroy();
      this._playing = false;
    }

    _applyRestingPosition() {
      const position = this.positions[this.activeTexture];
      this.bubble.setPosition(this.x, this.y).setScale(1);
      this.content
        .setPosition(this.x + position.x, this.y + position.y)
        .setScale(1);
    }
  }

  BubbleAnimationController.DEFAULTS = DEFAULTS;
  global.BubbleAnimationController = BubbleAnimationController;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleAnimationController;
  }
})(typeof window !== 'undefined' ? window : globalThis);
