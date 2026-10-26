import type { Metadata } from "next";
import { SimpleShell } from "@/components/simple-shell";
import { currentInstitution } from "@/server/context";

export const metadata: Metadata = { title: "Tratamiento de datos" };

export default async function PrivacyPage() {
  const inst = await currentInstitution();
  const name = inst?.name ?? "la institución";
  return (
    <SimpleShell>
      <article className="space-y-4">
        <h1 className="text-3xl font-extrabold">Aviso de tratamiento de datos personales</h1>
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Texto base técnico. Debe ser revisado y aprobado por la oficina jurídica y el responsable de protección de datos de {name} antes de su uso en producción, conforme a la Ley 1581 de 2012 y la política institucional de tratamiento de datos.
        </p>
        <h2 className="pt-2 text-xl font-bold">Responsable</h2>
        <p>{name} es responsable del tratamiento de los datos recogidos en esta plataforma.</p>
        <h2 className="pt-2 text-xl font-bold">Para qué usamos la información</h2>
        <p>
          Para identificar necesidades y expectativas del talento humano, definir y hacer seguimiento a acciones de mejora, y evidenciar el mejoramiento continuo dentro del proceso de preparación para la acreditación en salud. No se usa para evaluar el desempeño individual ni para tomar decisiones disciplinarias.
        </p>
        <h2 className="pt-2 text-xl font-bold">Participación anónima</h2>
        <p>
          En las consultas anónimas no pedimos nombre, documento ni usuario. La plataforma no guarda la dirección IP ni la hora de envío (solo la fecha) y usa identificadores aleatorios. Para consultar tu caso recibes un código que solo tú conoces; si lo pierdes, no podemos recuperarlo. Si en tus respuestas abiertas escribes datos que te identifiquen, esa información deja de ser anónima: te recomendamos no hacerlo.
        </p>
        <h2 className="pt-2 text-xl font-bold">Participación confidencial</h2>
        <p>
          En las consultas confidenciales ingresas con tu usuario. Tu identidad solo es visible para el equipo de Talento Humano, con el fin de contactarte y responder tu necesidad. Cada vez que alguien consulta tu identidad queda registrado en la auditoría del sistema.
        </p>
        <h2 className="pt-2 text-xl font-bold">Resultados agregados</h2>
        <p>
          Los resultados se presentan agrupados. Cuando un grupo tiene menos de {inst?.minGroupSize ?? 5} personas, sus resultados no se muestran, para impedir que alguien sea reconocido.
        </p>
        <h2 className="pt-2 text-xl font-bold">Qué no recogemos</h2>
        <p>No solicitamos datos de salud, creencias, orientación sexual, afiliación política o sindical, ni información clínica de pacientes.</p>
        <h2 className="pt-2 text-xl font-bold">Tus derechos</h2>
        <p>
          Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos personales, así como revocar la autorización, a través de los canales que {name} tiene definidos en su política de tratamiento de datos.
        </p>
      </article>
    </SimpleShell>
  );
}
