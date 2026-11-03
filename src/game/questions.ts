import type { Question } from './types';

/**
 * Banco de preguntas del prototipo: 20 preguntas de programación básica.
 * Dificultad 1 = fundamentos, 2 = control de flujo, 3 = detalles finos.
 */
export const QUESTIONS: Question[] = [
  {
    id: 'q-let',
    topic: 'Variables',
    difficulty: 1,
    prompt: '¿Cuál de estas líneas declara correctamente una variable en JavaScript moderno?',
    options: ['variable x = 5;', 'let x = 5;', 'int x = 5;', 'x := 5;'],
    answer: 1,
    explanation:
      'En JavaScript se usa let (o const para valores que no cambian). int y := pertenecen a otros lenguajes.',
  },
  {
    id: 'q-string',
    topic: 'Tipos de datos',
    difficulty: 1,
    prompt: '¿Qué tipo de dato es el valor "Hola"?',
    options: ['number', 'boolean', 'string', 'array'],
    answer: 2,
    explanation: 'Los textos entre comillas son strings (cadenas de texto).',
  },
  {
    id: 'q-mod',
    topic: 'Operadores',
    difficulty: 1,
    prompt: '¿Cuánto vale la expresión 7 % 2?',
    options: ['1', '2', '3.5', '0'],
    answer: 0,
    explanation:
      'El operador % devuelve el resto de la división. 7 entre 2 es 3 y sobra 1, así que 7 % 2 = 1.',
  },
  {
    id: 'q-gt',
    topic: 'Booleanos',
    difficulty: 1,
    prompt: '¿Qué valor produce la expresión 10 > 3?',
    options: ['true', 'false', '10', '3'],
    answer: 0,
    explanation: 'La comparación > devuelve un booleano: como 10 es mayor que 3, el resultado es true.',
  },
  {
    id: 'q-concat',
    topic: 'Operadores',
    difficulty: 1,
    prompt: 'En JavaScript, ¿cuál es el resultado de "2" + 2?',
    options: ['4', '"4"', '"22"', 'NaN'],
    answer: 2,
    explanation:
      'Si uno de los operandos es un string, el operador + concatena: "2" + 2 produce "22".',
  },
  {
    id: 'q-index',
    topic: 'Arrays',
    difficulty: 1,
    prompt: 'Dado el array [4, 8, 15], ¿cómo se obtiene el primer elemento?',
    options: ['arr[1]', 'arr[0]', 'arr.first', 'arr.get(0)'],
    answer: 1,
    explanation: 'Los arrays en JavaScript empiezan en el índice 0, así que el primero es arr[0].',
  },
  {
    id: 'q-else',
    topic: 'Condicionales',
    difficulty: 2,
    prompt: '¿Cuándo se ejecuta el bloque else de un if?',
    options: [
      'Siempre, después del if',
      'Solo si el if se ejecutó',
      'Cuando la condición del if es falsa',
      'Cuando la condición del if es verdadera',
    ],
    answer: 2,
    explanation: 'else es el camino alternativo: se ejecuta únicamente cuando la condición del if resulta falsa.',
  },
  {
    id: 'q-and',
    topic: 'Operadores lógicos',
    difficulty: 2,
    prompt: '¿Cuál es el resultado de true && false?',
    options: ['true', 'false', 'undefined', 'Error'],
    answer: 1,
    explanation: 'El operador && exige que ambos lados sean verdaderos. Como uno es false, el resultado es false.',
  },
  {
    id: 'q-for',
    topic: 'Bucles',
    difficulty: 2,
    prompt: '¿Cuántas veces se ejecuta el cuerpo de este bucle? for (let i = 0; i < 5; i++)',
    options: ['4', '6', '5', 'Infinitas'],
    answer: 2,
    explanation: 'i toma los valores 0, 1, 2, 3 y 4. Cuando i vale 5 la condición falla, así que son 5 vueltas.',
  },
  {
    id: 'q-length',
    topic: 'Arrays',
    difficulty: 2,
    prompt: '¿Qué devuelve [1, 2, 3].length?',
    options: ['2', '3', '4', 'undefined'],
    answer: 1,
    explanation: 'length indica cuántos elementos tiene el array. Este tiene tres, por lo que devuelve 3.',
  },
  {
    id: 'q-return',
    topic: 'Funciones',
    difficulty: 2,
    prompt: '¿Qué hace la instrucción return dentro de una función?',
    options: [
      'Devuelve un valor y termina la función',
      'Reinicia la función',
      'Imprime el valor en pantalla',
      'Solo se usa dentro de un bucle',
    ],
    answer: 0,
    explanation:
      'return entrega un valor a quien llamó a la función y detiene su ejecución en ese punto.',
  },
  {
    id: 'q-scope',
    topic: 'Alcance',
    difficulty: 2,
    prompt: 'Si declaras let nombre = "Ada" dentro de una función, ¿dónde existe esa variable?',
    options: [
      'En todo el programa',
      'Solo dentro de esa función',
      'Solo en el primer if de la función',
      'En todos los archivos del proyecto',
    ],
    answer: 1,
    explanation:
      'let respeta el alcance de bloque: la variable solo es visible dentro de la función donde se declaró.',
  },
  {
    id: 'q-inc',
    topic: 'Operadores',
    difficulty: 2,
    prompt: 'Después de ejecutar let n = 4; n++; ¿cuánto vale n?',
    options: ['3', '4', '5', '6'],
    answer: 2,
    explanation: 'n++ incrementa el valor en 1, así que 4 pasa a ser 5.',
  },
  {
    id: 'q-push',
    topic: 'Arrays',
    difficulty: 2,
    prompt: '¿Qué hace el método push en un array?',
    options: [
      'Agrega un elemento al final',
      'Quita el primer elemento',
      'Ordena el array',
      'Devuelve el último elemento',
    ],
    answer: 0,
    explanation: 'push añade uno o más elementos al final del array y devuelve su nueva longitud.',
  },
  {
    id: 'q-eq',
    topic: 'Igualdad',
    difficulty: 3,
    prompt: 'En JavaScript, ¿qué diferencia hay entre 0 == "0" y 0 === "0"?',
    options: [
      'Ambas expresiones son true',
      '== da true y === da false',
      '== da false y === da true',
      'Ambas expresiones son false',
    ],
    answer: 1,
    explanation:
      '== compara solo el valor y convierte tipos, así que 0 == "0" es true. === exige mismo valor y mismo tipo, por eso 0 === "0" es false.',
  },
  {
    id: 'q-while',
    topic: 'Bucles',
    difficulty: 3,
    prompt:
      '¿Qué ocurre si en un while la condición sigue siendo verdadera y nunca cambia?',
    options: [
      'El bucle se ejecuta una sola vez',
      'El programa lanza un error de sintaxis',
      'Se produce un bucle infinito',
      'El bucle se detiene solo tras 100 vueltas',
    ],
    answer: 2,
    explanation:
      'Si la condición nunca deja de cumplirse, el bucle no termina: es un bucle infinito y puede bloquear el programa.',
  },
  {
    id: 'q-undefined',
    topic: 'Tipos de datos',
    difficulty: 3,
    prompt: '¿Qué valor tiene una variable declarada con let pero sin asignarle nada?',
    options: ['null', 'undefined', '0', '""'],
    answer: 1,
    explanation:
      'Una variable declarada sin valor inicial vale undefined. null es una ausencia asignada de forma explícita.',
  },
  {
    id: 'q-switch',
    topic: 'Condicionales',
    difficulty: 3,
    prompt: '¿Para qué sirve break dentro de un switch?',
    options: [
      'Para repetir el caso actual',
      'Para salir del programa',
      'Para evitar que se ejecuten los casos siguientes',
      'Para declarar una variable',
    ],
    answer: 2,
    explanation:
      'Sin break, la ejecución "cae" al siguiente caso (fallthrough). break corta ese comportamiento y sale del switch.',
  },
  {
    id: 'q-param',
    topic: 'Funciones',
    difficulty: 3,
    prompt: 'En una función, ¿qué es un argumento?',
    options: [
      'El valor que se pasa al llamar a la función',
      'El nombre que aparece en la definición',
      'El valor que devuelve return',
      'Una variable global',
    ],
    answer: 0,
    explanation:
      'El parámetro es el nombre en la definición; el argumento es el valor concreto que se envía al llamar a la función.',
  },
  {
    id: 'q-recursion',
    topic: 'Recursión',
    difficulty: 3,
    prompt: '¿Cuál es la función del caso base en una función recursiva?',
    options: [
      'Hacer que la función se llame más rápido',
      'Detener la recursión y evitar un desbordamiento',
      'Repetir siempre la misma llamada',
      'Convertir la función en un bucle for',
    ],
    answer: 1,
    explanation:
      'El caso base es la condición de salida: sin él, la función se llamaría a sí misma indefinidamente.',
  },
];

/**
 * Elige una pregunta sin repetir las ya usadas. Prioriza la dificultad
 * acorde al nivel del jugador y, si se agota el banco, lo recicla.
 */
export function pickQuestion(level: number, usedIds: string[]): Question {
  const used = new Set(usedIds);
  let pool = QUESTIONS.filter((q) => !used.has(q.id));
  if (pool.length === 0) pool = QUESTIONS;

  const target = level <= 3 ? 1 : level <= 7 ? 2 : 3;
  const preferred = pool.filter((q) => q.difficulty === target);
  const candidates = preferred.length > 0 ? preferred : pool;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}
