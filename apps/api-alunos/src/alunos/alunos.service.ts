import { Injectable } from '@nestjs/common';

@Injectable()
export class AlunosService {
  private alunos = [
    { id: 1, nome: 'Ana', curso: 'Sistemas de Informação' },
    { id: 2, nome: 'Carlos', curso: 'Ciência da Computação' },
  ];

  findAll() {
    return this.alunos;
  }

  findById(id: number) {
    return this.alunos.find((aluno) => aluno.id === id);
  }

 create(nome: string, curso: string) {
  const novoAluno = {
    id: this.alunos.length + 1,
    nome,
    curso,
  };

  this.alunos.push(novoAluno);

  return novoAluno;
}
update(id: number, nome: string, curso: string) {
  const aluno = this.alunos.find((aluno) => aluno.id === id);

  if (!aluno) {
    return null;
  }

  aluno.nome = nome;
  aluno.curso = curso;

  return aluno;
}
delete(id: number) {
  const index = this.alunos.findIndex(
    (aluno) => aluno.id === id,
  );

  if (index === -1) {
    return false;
  }

  this.alunos.splice(index, 1);

  return true;
}
}