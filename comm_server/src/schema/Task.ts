interface Payload {
    operation: string,
    value: number
}

export default interface ITask {
    type: string,
    taskId: string,
    payload: Payload | null
}