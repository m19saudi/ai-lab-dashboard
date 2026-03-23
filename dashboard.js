let samples = [];
const limits = { pH:{min:6.5,max:8.5}, Ca:500, Mg:250, Cl:15000 };

const ctx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(ctx, {
    type:'line',
    data:{labels:[], datasets:[
        {label:'pH', data:[], borderColor:'#4f46e5', pointBackgroundColor:[], fill:false},
        {label:'Calcium', data:[], borderColor:'#10b981', pointBackgroundColor:[], fill:false},
        {label:'Magnesium', data:[], borderColor:'#f59e0b', pointBackgroundColor:[], fill:false},
        {label:'Chloride', data:[], borderColor:'#ef4444', pointBackgroundColor:[], fill:false}
    ]},
    options:{
        responsive:true,
        plugins:{legend:{position:'top'}},
        scales:{y:{beginAtZero:true}}
    }
});

// Read CSV file
function readCSV(file){
    return new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload = e=>{
            const lines = e.target.result.trim().split("\n");
            const result = [];
            lines.slice(1).forEach(line=>{
                const [id,pH,Ca,Mg,Cl] = line.split(",");
                result.push({id,pH:parseFloat(pH),Ca:parseFloat(Ca),Mg:parseFloat(Mg),Cl:parseFloat(Cl)});
            });
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Process CSV and call AI
async function processCSV(){
    const file = document.getElementById('csvFile').files[0];
    if(!file){ alert("Please select a CSV file"); return; }

    samples = await readCSV(file);
    updateTrendsAndAlerts();

    let aiOutput = "";
    for(const s of samples){
        const prompt = `Sample ${s.id}: pH ${s.pH}, Ca ${s.Ca} mg/L, Mg ${s.Mg} mg/L, Cl ${s.Cl} mg/L.
Analyze water type, risks (scaling/corrosion), and recommendations in simple language.`;

        try{
            const response = await fetch("/api/hf_ai", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body: JSON.stringify({prompt})
            });
            const data = await response.json();
            aiOutput += `Sample ${s.id} Analysis:\n${data.text}\n\n`;
        }catch(e){
            aiOutput += `Sample ${s.id} Analysis: Error calling AI\n\n`;
        }
    }

    document.getElementById('ai-output').innerText = aiOutput;
}

// Update trend chart and alerts
function updateTrendsAndAlerts(){
    trendChart.data.labels = samples.map(s=>s.id);
    const datasets = trendChart.data.datasets;
    const alertDiv = document.getElementById('alerts');
    alertDiv.innerHTML = "";

    ['pH','Ca','Mg','Cl'].forEach((param,idx)=>{
        datasets[idx].data = samples.map(s=>s[param]);
        datasets[idx].pointBackgroundColor = samples.map(s=>{
            let alert=false;
            if(param==='pH') alert = s[param]<limits.pH.min||s[param]>limits.pH.max;
            else alert = s[param]>limits[param];
            if(alert){
                const p = document.createElement('div');
                p.className="alerts";
                p.innerText=`Sample ${s.id} ALERT: ${param} = ${s[param]}`;
                alertDiv.appendChild(p);
                return '#ef4444';
            }
            return datasets[idx].borderColor;
        });
    });
    trendChart.update();
}
