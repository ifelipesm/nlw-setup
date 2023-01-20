import { DayHabit } from '@prisma/client'
import dayjs from 'dayjs'
import {FastifyInstance} from 'fastify'
import {z} from 'zod'

import { prisma } from "./lib/prisma"

export  async function appRoutes(app: FastifyInstance) {

  app.post('/habits',  async (request) => {
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6))
    })
      
    const { title, weekDays } = createHabitBody.parse(request.body)

    const today = dayjs().startOf('day').toDate()

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: { 
          create: weekDays.map(weekDay => {
            return {
              week_day: weekDay,
            }
          })
        }
      }
    })
  })

  app.get('/day',  async (request) => {
    const getDayParams = z.object({
      date: z.coerce.date()
    })
    
    const { date } = getDayParams.parse(request.query)
    const parsedDate = dayjs(date).startOf('day')
    const weekDay = parsedDate.get('day')

    console.log(date, weekDay)

    const possibleHabits = await prisma.habit.findMany({
      where:{
        created_at: {
          lte: date,
        },
        weekDays: {
          some: {
            week_day: weekDay,
          }
        }
      }
    })

    const day = await prisma.day.findUnique({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true,
      }
    })

    const completedHabits = day?.dayHabits.map(dayHabit => {
      return dayHabit.habit_id
    })

    return {
    possibleHabits,
    completedHabits,
    }
  })
  
  app.patch('/habits/:id/toggle',async (request) => {

    //definindo parametros
    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    })
    //recebendo id da requisição   
    const { id }  = toggleHabitParams.parse(request.params)

    //salvando a data atual e zerando hhmmss
    const today = dayjs().startOf('day').toDate()

    // buscando a data atual no banco
    let day = await prisma.day.findUnique({
      where: {
        date: today,
      }
    })

    // criando o registro da data do hábito caso ele nao exista
    if(!day){
      day = await prisma.day.create({
        data: {
          date: today,
        }
      })
    }

    // buscando o registro hábito <-> dia 
    const dayHabit = await prisma.dayHabit.findUnique({
      where:{
        day_id_habit_id:{
          day_id:day.id,
          habit_id: id,
        }
      }
    })

      // registro dia <-> hábito existe? deletar | criar
      if(dayHabit){
        await prisma.dayHabit.delete({
          where: {
            id: dayHabit.id,
          }
      })
      } 
      else {
        await prisma.dayHabit.create({
          data:{
            day_id:day.id,
            habit_id:id,
          }
        })
      }


    })

  app.get('/summary', async() => { 
    // Aqui temos 2 sub-queries
    //1 -> habitos concluidos ate a data informada (completed)
    //2 -> habitos registrados ate a data informada (amount)
    
     const summary = await prisma.$queryRaw`
      SELECT 
        D.id,
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM DayHabit DH
          WHERE DH.day_id = D.id 
        ) as completed,
        (
          SELECT
            cast(count(*) as float)
              FROM habit_week_days HWD 
                JOIN habits H 
                  ON H.id = HWD.habit_id
          WHERE HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
              AND H.created_at <= D.date 
        ) as amount 
      FROM days D
    `
    return summary
  })




}
