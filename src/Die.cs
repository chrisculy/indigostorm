using System.Collections.Generic;

namespace IndigoStorm
{
    public class Die
    {
        public string Name { get; set; }
        public IReadOnlyList<DieFace> Faces { get; set; }
    }
}