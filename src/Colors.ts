const colors: { name: string; color: string; }[] = [
    {
        name: 'body',
        color: '#2e3192'
    }
]

export class Colors {

    static getColor = (name:string) : string => {
        
        for (var color of colors) {
            if(color.name === name){
                return color.color
            }else{
                continue
            }
        }
    }

}