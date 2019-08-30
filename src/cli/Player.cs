using System;
using System.Collections.Generic;

namespace IndigoStorm
{
    public class Player
    {
        public Player(Die normalDie, Die uniqueDie)
        {
            _random = new Random();
            _normalDie = normalDie;
            _uniqueDie = uniqueDie;
        }

        public IReadOnlyList<DieFace> RollDice()
        {
            return new[] {
                RollDie(_normalDie),
                RollDie(_normalDie),
                RollDie(_normalDie),
                RollDie(_uniqueDie),
                RollDie(_uniqueDie),
            };
        }

        private DieFace RollDie(Die die)
        {
            return die.Faces[_random.Next(die.Faces.Count)];
        }

        private Die _normalDie;
        private Die _uniqueDie;
        private Random _random;
    }
}
