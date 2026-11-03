import type { Question } from './types';

/**
 * Banco de preguntas: 42 preguntas muy básicas de programación.
 * Dificultad 1 = fundamentos, 2 = control de flujo, 3 = detalles finos.
 */
export const QUESTIONS: Question[] = [
  {
    id: 'q-let',
    topic: 'Variables',
    difficulty: 1,
    prompt: '¿Cuál de estas líneas declara una variable en JavaScript moderno?',
    options: ['variable x = 5;', 'let x = 5;', 'int x = 5;', 'x := 5;'],
    answer: 1,
    explanation:
      'let (o const) declara variables en JavaScript. Las otras formas pertenecen a otros lenguajes.',
  },
  {
    id: 'q-const',
    topic: 'Variables',
    difficulty: 1,
    prompt: '¿Qué palabra se usa para declarar una constante?',
    options: ['var', 'let', 'const', 'final'],
    answer: 2,
    explanation: 'const declara una constante: su referencia no se puede reasignar.',
  },
  {
    id: 'q-string',
    topic: 'Tipos de datos',
    difficulty: 1,
    prompt: '¿Qué tipo de dato es "Hola"?',
    options: ['number', 'boolean', 'string', 'array'],
    answer: 2,
    explanation: 'Los textos entre comillas son strings (cadenas de texto).',
  },
  {
    id: 'q-number',
    topic: 'Tipos de datos',
    difficulty: 1,
    prompt: '¿Qué tipo de dato es 42?',
    options: ['string', 'number', 'boolean', 'array'],
    answer: 1,
    explanation: '42 es un número (number). Los números no llevan comillas.',
  },
  {
    id: 'q-boolean',
    topic: 'Tipos de datos',
    difficulty: 1,
    prompt: '¿Qué tipo de dato es true?',
    options: ['string', 'number', 'boolean', 'object'],
    answer: 2,
    explanation: 'true y false son valores booleanos.',
  },
  {
    id: 'q-typeof-string',
    topic: 'Tipos de datos',
    difficulty: 1,
    prompt: '¿Qué devuelve typeof "hola"?',
    options: ['"text"', '"string"', '"char"', '"array"'],
    answer: 1,
    explanation: 'typeof "hola" devuelve "string", porque "hola" es un texto.',
  },
  {
    id: 'q-typeof-number',
    topic: 'Tipos de datos',
    difficulty: 1,
    prompt: '¿Qué devuelve typeof 42?',
    options: ['"number"', '"string"', '"boolean"', '"int"'],
    answer: 0,
    explanation: 'typeof 42 devuelve "number".',
  },
  {
    id: 'q-plus',
    topic: 'Operadores',
    difficulty: 1,
    prompt: '¿Cuánto es 2 + 3?',
    options: ['4', '5', '6', '23'],
    answer: 1,
    explanation: '2 + 3 es 5. El operador + suma números.',
  },
  {
    id: 'q-minus',
    topic: 'Operadores',
    difficulty: 1,
    prompt: '¿Cuánto es 7 - 4?',
    options: ['2', '3', '4', '11'],
    answer: 1,
    explanation: '7 - 4 es 3. El operador - resta.',
  },
  {
    id: 'q-mult',
    topic: 'Operadores',
    difficulty: 1,
    prompt: '¿Cuánto es 3 * 4?',
    options: ['7', '12', '34', '1'],
    answer: 1,
    explanation: '3 * 4 es 12. El operador * multiplica.',
  },
  {
    id: 'q-div',
    topic: 'Operadores',
    difficulty: 1,
    prompt: '¿Cuánto es 10 / 2?',
    options: ['2', '4', '5', '20'],
    answer: 2,
    explanation: '10 / 2 es 5. El operador / divide.',
  },
  {
    id: 'q-mod',
    topic: 'Operadores',
    difficulty: 1,
    prompt: '¿Cuánto es 7 % 2?',
    options: ['1', '2', '3', '0'],
    answer: 0,
    explanation: 'El operador % devuelve el resto. 7 entre 2 es 3 y sobra 1.',
  },
  {
    id: 'q-gt',
    topic: 'Booleanos',
    difficulty: 1,
    prompt: '¿Qué devuelve 10 > 3?',
    options: ['true', 'false', '10', '3'],
    answer: 0,
    explanation: '10 es mayor que 3, así que la comparación devuelve true.',
  },
  {
    id: 'q-less',
    topic: 'Booleanos',
    difficulty: 1,
    prompt: '¿Qué devuelve 3 < 5?',
    options: ['true', 'false', '3', '5'],
    answer: 0,
    explanation: '3 es menor que 5, así que devuelve true.',
  },
  {
    id: 'q-equal',
    topic: 'Booleanos',
    difficulty: 1,
    prompt: '¿Qué devuelve 5 === 5?',
    options: ['true', 'false', '5', 'undefined'],
    answer: 0,
    explanation: '=== compara valor y tipo. Como ambos son el número 5, devuelve true.',
  },
  {
    id: 'q-and',
    topic: 'Operadores lógicos',
    difficulty: 1,
    prompt: '¿Qué devuelve true && false?',
    options: ['true', 'false', 'undefined', 'Error'],
    answer: 1,
    explanation: '&& solo es true si ambos lados son verdaderos. Como uno es false, devuelve false.',
  },
  {
    id: 'q-or',
    topic: 'Operadores lógicos',
    difficulty: 1,
    prompt: '¿Qué devuelve true || false?',
    options: ['true', 'false', 'undefined', 'NaN'],
    answer: 0,
    explanation: '|| es true si al menos uno de los lados es verdadero.',
  },
  {
    id: 'q-not',
    topic: 'Operadores lógicos',
    difficulty: 1,
    prompt: '¿Qué devuelve !true?',
    options: ['true', 'false', 'undefined', '0'],
    answer: 1,
    explanation: '! niega el valor: !true es false.',
  },
  {
    id: 'q-concat',
    topic: 'Strings',
    difficulty: 1,
    prompt: '¿Qué devuelve "a" + "b"?',
    options: ['"ab"', '"a b"', 'ab', 'Error'],
    answer: 0,
    explanation: 'El operador + une dos strings y forma "ab".',
  },
  {
    id: 'q-string-length',
    topic: 'Strings',
    difficulty: 1,
    prompt: '¿Qué devuelve "hola".length?',
    options: ['3', '4', '5', 'undefined'],
    answer: 1,
    explanation: 'length cuenta los caracteres: "hola" tiene 4.',
  },
  {
    id: 'q-upper',
    topic: 'Strings',
    difficulty: 1,
    prompt: '¿Qué devuelve "hola".toUpperCase()?',
    options: ['"Hola"', '"HOLA"', '"hola"', '"hOla"'],
    answer: 1,
    explanation: 'toUpperCase pasa todo el texto a mayúsculas.',
  },
  {
    id: 'q-string-index',
    topic: 'Strings',
    difficulty: 1,
    prompt: '¿Qué devuelve "abc"[0]?',
    options: ['"a"', '"b"', '"c"', 'undefined'],
    answer: 0,
    explanation: 'Los strings también empiezan en el índice 0, así que "abc"[0] es "a".',
  },
  {
    id: 'q-index',
    topic: 'Arrays',
    difficulty: 1,
    prompt: 'Dado el array [4, 8, 15], ¿cómo se obtiene el primer elemento?',
    options: ['arr[1]', 'arr[0]', 'arr.first', 'arr.get(0)'],
    answer: 1,
    explanation: 'Los arrays empiezan en el índice 0. El primero es arr[0].',
  },
  {
    id: 'q-array-second',
    topic: 'Arrays',
    difficulty: 1,
    prompt: 'Dado [10, 20, 30], ¿qué devuelve el elemento [1]?',
    options: ['10', '20', '30', 'undefined'],
    answer: 1,
    explanation: 'El índice 1 es el segundo elemento: 20.',
  },
  {
    id: 'q-array-length',
    topic: 'Arrays',
    difficulty: 1,
    prompt: '¿Qué devuelve [1, 2, 3].length?',
    options: ['2', '3', '4', 'undefined'],
    answer: 1,
    explanation: 'length indica cuántos elementos hay: 3.',
  },
  {
    id: 'q-array-empty',
    topic: 'Arrays',
    difficulty: 1,
    prompt: '¿Qué devuelve [].length?',
    options: ['0', '1', 'undefined', 'null'],
    answer: 0,
    explanation: 'Un array vacío tiene 0 elementos, así que length es 0.',
  },
  {
    id: 'q-push',
    topic: 'Arrays',
    difficulty: 1,
    prompt: '¿Qué hace array.push(5)?',
    options: [
      'Agrega 5 al final',
      'Quita el último elemento',
      'Ordena el array',
      'Lee el primer elemento',
    ],
    answer: 0,
    explanation: 'push agrega un elemento al final del array.',
  },
  {
    id: 'q-pop',
    topic: 'Arrays',
    difficulty: 1,
    prompt: '¿Qué hace array.pop()?',
    options: [
      'Agrega al final',
      'Quita el último elemento',
      'Quita el primero',
      'Ordena el array',
    ],
    answer: 1,
    explanation: 'pop quita y devuelve el último elemento del array.',
  },
  {
    id: 'q-includes',
    topic: 'Arrays',
    difficulty: 1,
    prompt: '¿Qué devuelve [1, 2, 3].includes(2)?',
    options: ['true', 'false', '2', 'undefined'],
    answer: 0,
    explanation: 'includes comprueba si el array contiene el valor 2. Como está, devuelve true.',
  },
  {
    id: 'q-object',
    topic: 'Objetos',
    difficulty: 1,
    prompt: 'Si user = { name: "Ada" }, ¿cómo se obtiene "Ada"?',
    options: ['user->name', 'user.name', 'user[name]', 'user::name'],
    answer: 1,
    explanation: 'La notación de punto accede a la propiedad: user.name.',
  },
  {
    id: 'q-object-value',
    topic: 'Objetos',
    difficulty: 1,
    prompt: '¿Qué devuelve ({ name: "Ada" }).name?',
    options: ['"Ada"', 'name', 'true', 'undefined'],
    answer: 0,
    explanation: 'La propiedad name vale "Ada".',
  },
  {
    id: 'q-else',
    topic: 'Condicionales',
    difficulty: 1,
    prompt: '¿Cuándo se ejecuta el bloque else de un if?',
    options: [
      'Siempre',
      'Solo si el if se ejecutó',
      'Cuando la condición del if es falsa',
      'Cuando la condición del if es verdadera',
    ],
    answer: 2,
    explanation: 'else se ejecuta cuando la condición del if es falsa.',
  },
  {
    id: 'q-if',
    topic: 'Condicionales',
    difficulty: 1,
    prompt: '¿Qué pasa si la condición de un if es true?',
    options: [
      'Se ejecuta su bloque',
      'Se ejecuta el else',
      'El programa termina',
      'No pasa nada',
    ],
    answer: 0,
    explanation: 'Si la condición es verdadera, se ejecuta el bloque del if.',
  },
  {
    id: 'q-for',
    topic: 'Bucles',
    difficulty: 1,
    prompt: '¿Cuántas veces se ejecuta for (let i = 0; i < 5; i++)?',
    options: ['4', '5', '6', 'Infinitas'],
    answer: 1,
    explanation: 'i vale 0, 1, 2, 3 y 4: son 5 vueltas.',
  },
  {
    id: 'q-increment',
    topic: 'Operadores',
    difficulty: 1,
    prompt: 'Después de let n = 4; n++; ¿cuánto vale n?',
    options: ['3', '4', '5', '6'],
    answer: 2,
    explanation: 'n++ suma 1: 4 pasa a 5.',
  },
  {
    id: 'q-decrement',
    topic: 'Operadores',
    difficulty: 1,
    prompt: 'Después de let n = 4; n--; ¿cuánto vale n?',
    options: ['3', '4', '5', '6'],
    answer: 0,
    explanation: 'n-- resta 1: 4 pasa a 3.',
  },
  {
    id: 'q-return',
    topic: 'Funciones',
    difficulty: 1,
    prompt: '¿Qué hace return dentro de una función?',
    options: [
      'Devuelve un valor y termina la función',
      'Reinicia la función',
      'Imprime el valor en pantalla',
      'Solo funciona dentro de un bucle',
    ],
    answer: 0,
    explanation: 'return entrega un valor y termina la ejecución de la función.',
  },
  {
    id: 'q-function-call',
    topic: 'Funciones',
    difficulty: 1,
    prompt: 'Si function suma(a, b) { return a + b; }, ¿cuánto devuelve suma(2, 3)?',
    options: ['5', '23', '6', 'undefined'],
    answer: 0,
    explanation: 'a vale 2 y b vale 3. La función devuelve 2 + 3 = 5.',
  },
  {
    id: 'q-console',
    topic: 'Herramientas',
    difficulty: 1,
    prompt: '¿Qué hace console.log("hola")?',
    options: [
      'Borra la consola',
      'Imprime "hola" en la consola',
      'Declara una variable',
      'Crea un archivo',
    ],
    answer: 1,
    explanation: 'console.log muestra el valor en la consola, muy útil para ver resultados.',
  },
  {
    id: 'q-pow2',
    topic: 'Binario',
    difficulty: 1,
    prompt: '¿Cuánto vale 2**5?',
    options: ['10', '25', '32', '64'],
    answer: 2,
    explanation: '2**5 es 2 × 2 × 2 × 2 × 2 = 32.',
  },
  {
    id: 'q-comment',
    topic: 'Sintaxis',
    difficulty: 1,
    prompt: '¿Cómo se escribe un comentario de una línea en JavaScript?',
    options: ['// comentario', '<!-- comentario -->', '# comentario', '/* comentario */'],
    answer: 0,
    explanation: '// inicia un comentario de una línea. /* ... */ sirve para varias líneas.',
  },
  {
    id: 'q-floor',
    topic: 'Matemáticas',
    difficulty: 1,
    prompt: '¿Qué devuelve Math.floor(3.9)?',
    options: ['3', '4', '3.9', '4.0'],
    answer: 0,
    explanation: 'Math.floor redondea hacia abajo: 3.9 se convierte en 3.',
  },
];


export const QUESTION_COUNT = QUESTIONS.length;

function shuffleOptions(question: Question): Question {
  const options = question.options.map((text, index) => ({
    text,
    correct: index === question.answer,
  }));

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }

  // Evita que, por azar, las opciones queden exactamente en el mismo orden.
  if (options.length > 1 && options.every((option, i) => option.text === question.options[i])) {
    options.push(options.shift()!);
  }

  return {
    ...question,
    options: options.map((option) => option.text),
    answer: options.findIndex((option) => option.correct),
  };
}

/**
 * Elige una pregunta al azar de todo el banco, sin priorizar dificultad.
 * Evita repetir hasta agotar las preguntas; al agotarse, el ciclo se reinicia.
 * Las opciones también se barajan en cada aparición.
 */
export function pickQuestion(usedIds: string[]): Question {
  const used = new Set(usedIds);
  let pool = QUESTIONS.filter((question) => !used.has(question.id));
  if (pool.length === 0) pool = QUESTIONS;

  const chosen = pool[Math.floor(Math.random() * pool.length)]!;
  return shuffleOptions(chosen);
}
