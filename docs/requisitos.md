## Tarefas

iremos precisar criar um novo domain, sera uma secao de tarefa para cada cliente, as tarefas serao feita por scrum entao
elas iniciarara pelo backlog e ira avancando a etapa de conclusao, precisamos ter uma opcao de ter templates de tarefas
prontas e aplicar o template e cria todas as tarefas no cliente, e tambem escolher diversas tarefas e criar template.
essas tarefas ira ter o usuario dono da tarefa, podemos ter um outro usuario que foi assigned a tarefa. teremos o dia e
hora de inicio, dia e horario de termino, tempo estimado, time-track, sprint(entao precisaremos de uma area que iremos
cadastrar as sprints desse usuario exemplo sprint 1 dia de inicio e termino), tarefas. pode aceitar opcionalmente
subtarefa e ou checklist, precisamo do campo progresso que ira sera calculado a percetamgem conforme conclui,
subtarefas, checklist ou a propria tarefa. teremo o campo impacto, confianca, esforco e o campo que e calculado o ice
score impacto \* confianca e / esforco. quanto maior a pontuacao do score maior ela deve ter mais prioridade.

a pagina de tarefa tera por padrao a visualizacao de lista, poderemos trocar para o modo kanban, calendario onde ira
mostrar as tarefas nos dias previsto e tambem no modo de exemplo em imagem esqueci o nome desse modo Gantt

precisamos de log de atualizacoes da tarefa, em lugar mostrar dia x e hora bruno criou tarefa, dia y usuario maria
atualizou....

precisamos conseguir criar comentarios em cada tarefa, escrito com arquivo em anexo tambem, enviar um audio diretamente
gravado na hora, e ter a opcao de marcar como concluido e tambem reagir com emogi ou criar cadeia de respostas. precisa
ter campo de clicar resolvido. adcionar video adcionar imagem, quando e imagem poderemos adcionar cometarios onde
sinaliza um local da imagem que ira mostrar o numero 1 por exeplo e no campo de texto escreve o que deve ser feito nessa
area. podendo sinalizar para outro usuario.

precisamos conseguir adcionar tags em cada tarefa, e na prorio campo de tag podemos cadastrar uma nova escolhendo a cor
ou escolher uma ja cadastrada

## Atividades

precisamos registrar todas as comunicacoes com o cliente, entao teremos uma area de atividades que pode ser tipo, email,
whatsapp, telefone, com data e hora realizado agendar, podemos mudar para em aberto concluido cancela pular. descricao

as atividade serao automatizadas tambem com api. temos que ter integracao com o voip GoTo que ira indentificar o numero
do cliente e onde ira enviar o audio para o s3 que pode ser tocado e tambem deve ser enviado para o app que eu tenho de
transcricao e adcione na atividade. ao clicar no numero de cadastro ja disca usando o goto instalado integracao com o
gmail, o emai que ira identificar e similar acima ja cria a atividade e anexa o email, e tambem clicando no email
caastrado de dentro do sistema devemos conseguir escrever o email e anexar arquivos. inetgracao whatsapp, temos o
evoltion ja funcionando e similar a integracao cada mensagem trocada com o cliente sera criada atividade no sistema.

essas automacoes com as APIs acima ja implementei em outro sistema, entao quando chegar a hora de implementar eu irei de
dar todos os detalhes da implementacao. Goto, whatsapp, gmail, drive.

precisamos conseguir tarefas que sao ideias para esse projeto, portanto e deixar registrado mas nao poluir a lista
padrao de tarefas, para nao poluir agora e as ideias ainda podem ser classificadas algo como "poderiamos fazer" algo que
parece bom mas nao pode ser prioridade e tambem "devemos fazer" algo que esta fazendo mais sentido a curto prazo mas
ainda nao pode poluir a lista de tarefa e uma ideia ainda temos que fazer primeiro o basico, que seria o backlog que sao
tarefas que ja estao em pronta para fazer as outras que sao ainda ideias porque nao tem detalhes da tarefa

a tarefa pode ser recorrente e ao criar e editar podemos definir se ela e diaria, semanal, mensal ou personalizada. quer
dizer que automaticamente ela sera sempre adcionada na data. mas mesmo assim precisamos ver na lista os recorrentes para
facilemente conseguir ver as tarefas corriqueiras do projeto.

## Criativos

iremos precisar gerir os criativos de cada cliente. precisaremos salvar na em uma pasta exclusiva para o cliente no
drive entao faremos o upload da pagina e visualizaremos eles tambem, teremos tipos de criativos como imagem, video,
carrossel, legenda, titulo no criativo, texto no criativo e descricao do design do criativo ou do video. entao
precisaremos de todas as informacoes porque iremos usar os criativos e conjunto de criativos em trafego pago e
precisaremos medir a performance de cada um para quando nao funcionar ja saber o que funcionou ou nao. precisamos ter o
campo objetivo da campanha

entao as estrategias que iremos ter a-exploracao iremos testar cerca de 10 criativos com orcamento pequeno e ver qual ou
quais funcionaram melhor dutante 5 dias. b-lapidacao iremos fazer pequenas variacoes do campeao da etapa a e ver qual
funcionou melhor. entao os criativos precisaremos registrar essas informacoes.

## trafego pago

entao teremos vinculacao da minha conta de BM do meta e la terei os meus clientes que irei administrar, aqui iremos ver
a cada dia a etapa exploracao mencionada no criativos aqui que iremos registrar os dados de trafego pago de cada
criativo, vizualizacoes, custo por clique, etc. e otimizacoes, campanhas temos que cadastrar a verba prevista e gasta.
mostrar ativos e nao

# CRM do cliente

o cliente ira ter um crm na nuvem que ele ira receber os leads vindo do trafego pago. mas aqui iremos registrar quantos
leads foram cadastrados, de qual campanha de trafego, e documentar o funil de vendas calculando a porcentagem de cada
etapa do funil converteu, e tambem o tempo de atendimento do vendedor.
