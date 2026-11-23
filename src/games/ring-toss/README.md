# Ring Toss

Land your rings on the bottle necks before you run out.

## How to play

- Move the mouse to aim, and click to throw a ring at the aim marker.
- The aim marker sways left and right by up to 24 px, so time your throw. The
  ring lands where the marker was when you clicked.
- One ring flies at a time. You have 8 rings, and the round ends when the last
  one has landed.
- Click again on the game over screen to play another round.

## Scoring

Fifteen bottles stand in three rows of five. A ring that lands on a bottle's
neck scores that bottle's points. Bottles further back are smaller, with
narrower necks, and score more:

| Row    | Neck radius | Points |
| ------ | ----------- | ------ |
| Back   | 9 px        | 30     |
| Middle | 11 px       | 20     |
| Front  | 13 px       | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `swayAt`,
  `bottleAt`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
