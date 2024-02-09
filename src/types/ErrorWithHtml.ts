export class ErrorWithHtml extends Error {
  htmlString: string;
  constructor(message: string, htmlString: string) {
    super(message);
    this.htmlString = htmlString;
  }
}
