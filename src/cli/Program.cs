using System;
using System.IO;
using System.Linq;
using System.Reflection;

namespace IndigoStorm
{
   public  class Program
    {
        public static void Main()
        {
            var basePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            var configuration = Configuration.Load(Path.Combine(basePath, "resources", "data.json"));

            var normalDie = configuration.Dice.First(x => x.Name == c_normalDieName);
            var characterNames = configuration.Dice.Where(x => x.Name != c_normalDieName).Select(x => x.Name).ToList();
            Console.WriteLine("Choose a character to play:");
            for (var i = 0; i < characterNames.Count; i++)
            {
                Console.WriteLine($"{i}:\t{characterNames[i]}");
            }

            var characterIndexInput = GetInput().KeyChar;
            var characterIndex = int.Parse($"{characterIndexInput}");
            var player = new Player(normalDie, configuration.Dice.First(x => x.Name == characterNames[characterIndex]));

            while (true)
            {
                Console.WriteLine("Choose a command:");
                Console.WriteLine(" r - roll dice");
                Console.WriteLine(" q - quit");
                
                var input = GetInput();
                if (input.Key == ConsoleKey.Q)
                {
                    Console.WriteLine("Thanks for playing!");
                    break;
                }

                if (input.Key == ConsoleKey.R)
                {
                    var rolledDieFaces = player.RollDice();

                    Console.WriteLine("You rolled:");
                    foreach (var dieFace in rolledDieFaces)
                    {
                        Console.WriteLine($"{dieFace.Value} | {dieFace.Action}");
                    }
                    Console.WriteLine();
                }
            }
        }

		private static ConsoleKeyInfo GetInput()
		{
			var input = Console.ReadKey();
			Console.WriteLine();
			return input;
		}

        private const string c_normalDieName = "normal";
    }
}
