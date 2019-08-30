using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;

namespace IndigoStorm
{
    public class Configuration
    {
        public IReadOnlyList<string> ValidActions { get; set; }
        public IReadOnlyList<Die> Dice { get; set; }

        public static Configuration Load(string filePath)
        {
            try
            {
                var configuration = JsonConvert.DeserializeObject<Configuration>(File.ReadAllText(filePath));
                return configuration;
            }
            catch (Exception e)
            {
                Console.Error.WriteLine($"An error occurred loading the configuration:\n{e.ToString()}");
                return null;
            }
        }
    }
}