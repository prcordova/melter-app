export interface FixedCategory {
  _id: string;
  name: string;
}

export const FIXED_CATEGORIES: FixedCategory[] = [
  { _id: 'educacao', name: 'Educação' },
  { _id: 'tecnologia', name: 'Tecnologia' },
  { _id: 'negocios', name: 'Negócios' },
  { _id: 'criatividade', name: 'Criatividade' },
  { _id: 'jogos', name: 'Jogos' },
  { _id: 'humor', name: 'Humor' },
  { _id: 'entretenimento', name: 'Entretenimento' },
  { _id: 'seguranca', name: 'Segurança' },
  { _id: 'informacao', name: 'Informação' },
  { _id: 'conteudo-18', name: 'Conteúdo +18' },
  { _id: 'outros', name: 'Outros' },
];
