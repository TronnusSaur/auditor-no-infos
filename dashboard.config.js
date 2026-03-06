/**
 * DASHBOARD TEMPLATE CONFIGURATION
 * Edit this file to customize your dashboad engine.
 */

export const DASHBOARD_CONFIG = {
    title: "AUDITOR NO INFOS",
    subtitle: "CONTROL DE REGISTRO 1RA ETAPA",
    logoText: "AUDITOR",
    brandColor: "#7a1531",

    // Define the filters shown in the header
    filters: [
        {
            id: "company",
            label: "Entidad/Empresa",
            type: "select",
            dataField: "ENTIDAD"
        },
        {
            id: "contract",
            label: "Control/Contrato",
            type: "select",
            dataField: "CONTROL",
            dependsOn: "company"
        }
    ],

    // Define the KPI cards at the top
    kpis: [
        {
            label: "Total Folios",
            dataKey: "total",
            icon: "list",
            color: "blue",
            borderColor: "border-l-blue-500"
        },
        {
            label: "Folios Vacíos",
            dataKey: "vacios",
            icon: "warning",
            color: "orange",
            borderColor: "border-l-orange-500"
        },
        {
            label: "Folios No Ejecutados",
            dataKey: "noEjecutados",
            icon: "error",
            color: "red",
            borderColor: "border-l-red-500"
        },
        {
            label: "Con Información",
            dataKey: "conInfo",
            icon: "check",
            color: "green",
            borderColor: "border-l-green-500"
        }
    ],

    // Chart customization
    visualizations: {
        bar: {
            title: "Estado de Folios",
            layout: "horizontal"
        },
        pie: {
            title: "Distribución de Datos",
            innerRadius: 60,
            outerRadius: 90
        }
    }
};
