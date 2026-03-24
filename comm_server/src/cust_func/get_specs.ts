import si from "systeminformation";

export default async function getSystemInfo() {
    const cpu = await si.cpu();
    const mem = await si.mem();
    const disk = await si.diskLayout();
    const os = await si.osInfo();
    const gpu = await si.graphics();

    return {
        'CPU' : cpu,
        'RAM' : mem,
        'Disk' : disk,
        'OS' : os,
        'GPU' : gpu
    }
}

