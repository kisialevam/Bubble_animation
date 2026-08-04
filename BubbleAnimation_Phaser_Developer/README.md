# Bubble Animation — пакет для разработчика

Готовая анимация переключения `x1 ↔ WOW` для Phaser. Ползунков в этой версии нет: параметры уже зафиксированы. Файл `demo.html` содержит только кнопку запуска.

## Состав архива

- `bubble-animation.js` — независимый контроллер анимации;
- `demo.html` — минимальная демонстрация с кнопкой;
- `assets/buble.png` — изображение бабла, 299×211;
- `assets/x1.png` — изображение `x1`, 234×90;
- `assets/wow.png` — изображение `WOW`, 229×80.

CDN Phaser используется только в `demo.html`. В рабочей игре контроллер использует уже существующий экземпляр Phaser и не загружает сторонние зависимости.

## Быстрое подключение

Подключить контроллер после Phaser:

```html
<script src="phaser.min.js"></script>
<script src="bubble-animation.js"></script>
```

Загрузить изображения в `preload()` сцены:

```js
preload() {
  this.load.image('bubble', 'assets/buble.png');
  this.load.image('x1', 'assets/x1.png');
  this.load.image('wow', 'assets/wow.png');
}
```

Создать контроллер в `create()`:

```js
create() {
  this.bubbleAnimation = new BubbleAnimationController(this, {
    x: this.scale.gameSize.width / 2,
    y: this.scale.gameSize.height / 2,
    depth: 100,
    onSwitch: (activeTexture) => {
      console.log('Теперь показано:', activeTexture);
    },
    onComplete: () => {
      console.log('Анимация завершена');
    }
  });
}
```

Запустить анимацию из нужного игрового события:

```js
this.bubbleAnimation.play();
```

Повторный вызов после завершения автоматически переключит картинку обратно. Вызов во время активной анимации безопасно игнорируется и возвращает `false`.

При изменении размеров игры:

```js
this.bubbleAnimation.setPosition(newCenterX, newCenterY);
```

При уничтожении сцены:

```js
this.bubbleAnimation.destroy();
```

## Зафиксированные параметры

```js
positions: {
  x1:  { x: 8, y: -20 },
  wow: { x: 5, y: -19 }
},
settings: {
  anticipation: 36,
  jumpHeight: 43,
  landingBounce: 24,
  speed: 2,
  switchMoment: 90,
  bubbleReaction: 1.7
}
```

Координаты картинок считаются относительно центра бабла. `switchMoment: 90` означает позднюю смену изображения — на 90% пути вниз. `bubbleReaction: 1.7` соответствует реакции бабла 170%.

Все значения можно переопределить при создании контроллера через `positions` и `settings`, не меняя исходник.

## API

- `play()` — запускает переключение; возвращает `true`, если запуск состоялся;
- `reset('x1' | 'wow')` — без анимации выставляет нужную картинку;
- `setPosition(x, y)` — переносит всю композицию;
- `destroy()` — останавливает анимацию и удаляет созданные изображения;
- `isPlaying` — показывает, выполняется ли анимация сейчас;
- `activeTexture` — содержит `'x1'` или `'wow'`;
- `bubble` и `content` — Phaser Image-объекты для дополнительной настройки.

Контроллер использует стандартные API `Scene`, `Tweens`, `Time` и `Image`, без физики и аудио.
