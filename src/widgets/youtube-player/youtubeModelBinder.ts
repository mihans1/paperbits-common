import { IWidgetBinding } from "../../editing/IWidgetBinding";
import { IModelBinder } from "../../editing/IModelBinder";
import { IYoutubePlayerNode } from "./IYoutubePlayerNode";
import { YoutubePlayerModel } from "./youtubePlayerModel";


export class YoutubeModelBinder implements IModelBinder {
    constructor() {
        this.nodeToModel = this.nodeToModel.bind(this);
    }

    public canHandleWidgetType(widgetType: string): boolean {
        return widgetType === "youtube-player";
    }

    public canHandleModel(model): boolean {
        return model instanceof YoutubePlayerModel;
    }

    public async nodeToModel(youtubeNode: IYoutubePlayerNode): Promise<YoutubePlayerModel> {
        let youtubePlayerModel = new YoutubePlayerModel();

        youtubePlayerModel.videoId = youtubeNode.videoId;

        return youtubePlayerModel;
    }

    public getConfig(youtubeModel: YoutubePlayerModel): IYoutubePlayerNode {
        let youtubeConfig: IYoutubePlayerNode = {
            kind: "block",
            type: "youtube-player",
            videoId: youtubeModel.videoId
        }

        return youtubeConfig;
    }
}