import React from "react";
import ReactApexChart from "react-apexcharts";

class LineChart extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      chartData: [],
      chartOptions: {},
    };
  }

  componentDidMount() {
    this.setState({
      chartData: this.props.chartData,
      chartOptions: this.props.chartOptions,
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.chartData !== this.props.chartData || prevProps.chartOptions !== this.props.chartOptions) {
      // 빈 데이터가 들어오면 state 업데이트 하지 않음
      const hasValidData = this.props.chartData &&
                           Array.isArray(this.props.chartData) &&
                           this.props.chartData.length > 0 &&
                           this.props.chartData[0]?.data?.length > 0;

      if (hasValidData) {
        this.setState({
          chartData: this.props.chartData,
          chartOptions: this.props.chartOptions,
        });
      }
    }
  }

  render() {
    const hasData = this.state.chartData &&
                     Array.isArray(this.state.chartData) &&
                     this.state.chartData.length > 0 &&
                     this.state.chartData[0]?.data?.length > 0;

    if (!hasData) {
      return null;
    }

    return (
      <ReactApexChart
        options={this.state.chartOptions}
        series={this.state.chartData}
        type='line'
        width='100%'
        height='100%'
      />
    );
  }
}

export default LineChart;
