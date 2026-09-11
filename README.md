# Vibrómetro virtual · La Movida de SST Plus

Simulador didáctico de vibraciones mano–brazo (HAV) y cuerpo entero sentado (WBV). Aplicación estática con acceso de integrantes existente.

## Revisión 2026-09-11

- RMS energético acumulado de bloques sintéticos de un segundo. Wh/Wd/Wk están representadas por datos ya ponderados: no se filtra una señal física.
- HAV: suma vectorial; WBV: factores 1,4 / 1,4 / 1 y exposición acumulada por eje antes de elegir el dominante.
- POWER, comprobación simulada, rango, iniciar/detener/continuar, pausa, RESET y memoria. Cambiar montaje o modo exige repetir comprobación; cambiar rango descarta la serie anterior.
- Sobrecarga evaluada con picos sintéticos; bajo-rango por eje. Una serie inválida no se guarda ni agrega a jornada.
- Mínimo de 10 s exclusivamente para el ejercicio, sin atribuir representatividad ni carácter normativo.
- Guía navegable, barras triaxiales, ayudas de controles, navegación móvil y descarga CSV de hasta 50 lecturas de sesión.
- Jornadas HAV y WBV separadas, máximo de 24 h por modalidad. En HAV, cada jornada representa una misma mano.
- VDV explicado, no calculado: no se dispone de la señal temporal para integrar su cuarta potencia. RMS, PEAK y CF corresponden al mismo eje (mayor RMS sin k); los picos son sintéticos.

Los escenarios y rangos son ilustrativos, no mediciones de máquinas concretas ni especificaciones comerciales. No se usan sensores del dispositivo. Los valores no constituyen un informe de evaluación ocupacional.

## Validación

Ejecutar `node --test tests/*.test.cjs`. Pruebas numéricas independientes y de estados con adaptador DOM; no sustituyen una prueba visual en navegador.

Referencias para consulta: ISO 5349-1, ISO 2631-1 e ISO 8041-1 (verificar ediciones aplicables). Guías preventivas HSE: https://www.hse.gov.uk/pubns/indg175.pdf y https://www.hse.gov.uk/pubns/indg242.pdf.

David Linares Brea · info@movidasst.com · +56 9 6861 5650

De la Reacción a la Prevención · https://www.movidasst.com
