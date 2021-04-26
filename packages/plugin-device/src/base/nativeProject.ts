
export interface Device {
    availability?: string;
    state?: string;
    isAvailable?: boolean;
    name: string;
    udid: string;
    version?: string;
    availabilityError?: string;
    type?: 'simulator' | 'device' | 'catalyst';
    booted?: boolean; 
}
  
type launchData = {

    projectPath:string,
    deviceOption: string | undefined;
}

export class  NativeProject {

    public launchData:launchData;
    constructor(data:launchData) {
        this.launchData = data;
    }
    public async run() {

    }
}